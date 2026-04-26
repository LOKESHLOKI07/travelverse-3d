import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

/// Heap state survives canister upgrades (orthogonal persistence / `--default-persistent-actors`).
persistent actor {
  public type AddOnDef = {
    addOnId : Nat;
    label : Text;
    priceINR : Nat;
  };

  public type PrivatePricing = {
    #single : { pricePerPersonINR : Nat };
    #multi : { tiers : [{ label : Text; pricePerPersonINR : Nat }] };
  };

  public type PrivateCfg = {
    minGroupSize : Nat;
    maxGroupSize : Nat;
    pricing : PrivatePricing;
    addOns : [AddOnDef];
    /// Day-by-day narrative for private tours (Day 1, Day 2, …).
    itineraryDays : [Text];
  };

  public type FixedBatch = {
    batchId : Nat;
    dateLabel : Text;
    seatsTotal : Nat;
    seatsRemaining : Nat;
  };

  public type FixedCfg = {
    pricePerPersonINR : Nat;
    batches : [FixedBatch];
    addOns : [AddOnDef];
    inclusions : [Text];
  };

  public type PackageDetail = {
    #private : PrivateCfg;
    #fixed : FixedCfg;
  };

  public type TourPackage = {
    id : Nat;
    categoryId : Nat;
    name : Text;
    shortDescription : Text;
    heroImageUrl : Text;
    active : Bool;
    detail : PackageDetail;
  };

  public type CategoryRecord = {
    id : Nat;
    name : Text;
    sortOrder : Nat;
    active : Bool;
  };

  public type CategoryView = {
    category : CategoryRecord;
    packages : [TourPackage];
  };

  public type BookingStatus = {
    #pending;
    #confirmed;
    #cancelled;
  };

  public type Booking = {
    bookingId : Nat;
    packageCategory : Text;
    packageName : Text;
    customerName : Text;
    customerEmail : Text;
    customerPhone : Text;
    travelDate : Text;
    groupSize : Nat;
    addOns : [Text];
    totalPriceINR : Nat;
    status : BookingStatus;
    createdTimestamp : Time.Time;
    catalogPackageId : Nat;
    catalogBatchId : ?Nat;
    catalogTierIndex : ?Nat;
  };

  let bookings = Map.empty<Nat, Booking>();
  let bookingsByEmail = Map.empty<Text, [Nat]>();
  let categories = Map.empty<Nat, CategoryRecord>();
  let packages = Map.empty<Nat, TourPackage>();
  var nextCategoryId : Nat = 1;
  var nextPackageId : Nat = 1;
  var nextGlobalBatchId : Nat = 1;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextBookingId : Nat = 1;

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
  };

  func categoryNameOrTrap(catId : Nat) : Text {
    switch (categories.get(catId)) {
      case (null) { Runtime.trap("Unknown category") };
      case (?c) { c.name };
    };
  };

  func sumAddOnPrices(defs : [AddOnDef], selectedIds : [Nat]) : Nat {
    var sum : Nat = 0;
    for (sid in selectedIds.vals()) {
      var hit : ?Nat = null;
      for (d in defs.vals()) {
        if (d.addOnId == sid) {
          hit := ?d.priceINR;
        };
      };
      switch (hit) {
        case (null) { Runtime.trap("Invalid add-on id") };
        case (?p) { sum += p };
      };
    };
    sum;
  };

  func addOnLabels(defs : [AddOnDef], selectedIds : [Nat]) : [Text] {
    var out : [Text] = [];
    for (sid in selectedIds.vals()) {
      var label : ?Text = null;
      for (d in defs.vals()) {
        if (d.addOnId == sid) {
          label := ?d.label;
        };
      };
      switch (label) {
        case (null) { Runtime.trap("Invalid add-on id") };
        case (?t) { out := Array.append(out, [t]) };
      };
    };
    out;
  };

  func takeSeatsFromBatch(pkg : TourPackage, batchId : Nat, n : Nat) : TourPackage {
    switch (pkg.detail) {
      case (#private _) { Runtime.trap("Not a fixed package") };
      case (#fixed f) {
        let newBatches = Array.map<FixedBatch, FixedBatch>(
          f.batches,
          func(b : FixedBatch) : FixedBatch {
            if (b.batchId != batchId) {
              b;
            } else {
              if (n > b.seatsRemaining) {
                Runtime.trap("Not enough seats");
              };
              { b with seatsRemaining = b.seatsRemaining - n };
            };
          },
        );
        { pkg with detail = #fixed({ f with batches = newBatches }) };
      };
    };
  };

  func releaseSeatsToBatch(pkg : TourPackage, batchId : Nat, n : Nat) : TourPackage {
    switch (pkg.detail) {
      case (#private _) { Runtime.trap("Not a fixed package") };
      case (#fixed f) {
        let newBatches = Array.map<FixedBatch, FixedBatch>(
          f.batches,
          func(b : FixedBatch) : FixedBatch {
            if (b.batchId != batchId) {
              b;
            } else {
              let next = b.seatsRemaining + n;
              if (next > b.seatsTotal) {
                Runtime.trap("Seat restore invalid");
              };
              { b with seatsRemaining = next };
            };
          },
        );
        { pkg with detail = #fixed({ f with batches = newBatches }) };
      };
    };
  };

  func findBatch(f : FixedCfg, batchId : Nat) : ?FixedBatch {
    var found : ?FixedBatch = null;
    for (b in f.batches.vals()) {
      if (b.batchId == batchId) {
        found := ?b;
      };
    };
    found;
  };

  func validatePackageShape(pkg : TourPackage) {
    if (pkg.name == "") Runtime.trap("Package name required");
    switch (categories.get(pkg.categoryId)) {
      case (null) { Runtime.trap("Unknown category") };
      case (_) {};
    };
    switch (pkg.detail) {
      case (#private p) {
        if (p.minGroupSize == 0) Runtime.trap("minGroupSize");
        if (p.maxGroupSize < p.minGroupSize) Runtime.trap("maxGroupSize");
        switch (p.pricing) {
          case (#single s) {
            if (s.pricePerPersonINR == 0) Runtime.trap("price");
          };
          case (#multi m) {
            if (m.tiers.size() == 0) Runtime.trap("tiers");
            for (t in m.tiers.vals()) {
              if (t.pricePerPersonINR == 0) Runtime.trap("tier price");
            };
          };
        };
      };
      case (#fixed f) {
        if (f.pricePerPersonINR == 0) Runtime.trap("price");
        if (f.batches.size() == 0) Runtime.trap("batches");
        for (b in f.batches.vals()) {
          if (b.seatsTotal == 0) Runtime.trap("seatsTotal");
          if (b.seatsRemaining > b.seatsTotal) Runtime.trap("seatsRemaining");
        };
      };
    };
  };

  func insertPackageRecord(pkg : TourPackage) : Nat {
    validatePackageShape(pkg);
    if (pkg.id == 0) {
      let id = nextPackageId;
      nextPackageId += 1;
      let withId = { pkg with id };
      packages.add(id, withId);
      id;
    } else {
      switch (packages.get(pkg.id)) {
        case (null) { Runtime.trap("Package not found") };
        case (_) {
          packages.add(pkg.id, pkg);
          pkg.id;
        };
      };
    };
  };

  public query func listCatalog() : async [CategoryView] {
    var raw : [CategoryView] = [];
    for (kv in categories.entries()) {
      let (_, c) = kv;
      if (c.active) {
        var pbuf : [TourPackage] = [];
        for (pkv in packages.entries()) {
          let (_, p) = pkv;
          if (p.categoryId == c.id and p.active) {
            pbuf := Array.append(pbuf, [p]);
          };
        };
        raw := Array.append(raw, [{ category = c; packages = pbuf }]);
      };
    };
    Array.sort(
      raw,
      func(a : CategoryView, b : CategoryView) : Order.Order {
        Nat.compare(a.category.sortOrder, b.category.sortOrder);
      },
    );
  };

  public query func getPackage(packageId : Nat) : async ?TourPackage {
    switch (packages.get(packageId)) {
      case (null) { null };
      case (?p) {
        if (not p.active) {
          null;
        } else {
          ?p;
        };
      };
    };
  };

  public shared ({ caller }) func adminUpsertCategory(
    idOpt : ?Nat,
    name : Text,
    sortOrder : Nat,
    active : Bool,
  ) : async Nat {
    requireAdmin(caller);
    if (name == "") Runtime.trap("Category name required");
    switch (idOpt) {
      case (null) {
        let id = nextCategoryId;
        nextCategoryId += 1;
        categories.add(id, { id; name; sortOrder; active });
        id;
      };
      case (?id) {
        switch (categories.get(id)) {
          case (null) { Runtime.trap("Category not found") };
          case (_) {
            categories.add(id, { id; name; sortOrder; active });
            id;
          };
        };
      };
    };
  };

  public shared ({ caller }) func adminDeleteCategory(categoryId : Nat) : async () {
    requireAdmin(caller);
    Map.remove(categories, Nat.compare, categoryId);
  };

  public shared ({ caller }) func adminPutPackage(pkg : TourPackage) : async Nat {
    requireAdmin(caller);
    insertPackageRecord(pkg);
  };

  public shared ({ caller }) func adminDeletePackage(packageId : Nat) : async () {
    requireAdmin(caller);
    Map.remove(packages, Nat.compare, packageId);
  };

  /// Allocate consecutive batch ids for new fixed-package batches (admin UI).
  public shared ({ caller }) func adminReserveBatchIds(count : Nat) : async [Nat] {
    requireAdmin(caller);
    if (count == 0) {
      Runtime.trap("count must be positive");
    };
    let start = nextGlobalBatchId;
    nextGlobalBatchId += count;
    var out : [Nat] = [];
    var i : Nat = 0;
    while (i < count) {
      out := Array.append(out, [start + i]);
      i += 1;
    };
    out;
  };

  public shared ({ caller }) func adminSeedDemoCatalog() : async () {
    requireAdmin(caller);
    if (categories.size() > 0) {
      return;
    };

    let catPrivate = nextCategoryId;
    nextCategoryId += 1;
    categories.add(
      catPrivate,
      { id = catPrivate; name = "Private Travel"; sortOrder = 1; active = true },
    );
    let catFixed = nextCategoryId;
    nextCategoryId += 1;
    categories.add(
      catFixed,
      { id = catFixed; name = "Fixed Departures"; sortOrder = 2; active = true },
    );

    let addonRafting : AddOnDef = { addOnId = 1; label = "River Rafting"; priceINR = 800 };
    let addonPara : AddOnDef = { addOnId = 2; label = "Paragliding"; priceINR = 2500 };
    let addonSki : AddOnDef = { addOnId = 3; label = "Snow Skiing"; priceINR = 1500 };
    let addonCamp : AddOnDef = { addOnId = 4; label = "Camping under Stars"; priceINR = 600 };
    let addonPhoto : AddOnDef = { addOnId = 5; label = "Photography Workshop"; priceINR = 1200 };
    let privateAddOns = [addonRafting, addonPara, addonSki, addonCamp, addonPhoto];

    let tiers = [
      { label = "Standard"; pricePerPersonINR = 15_000 },
      { label = "Deluxe"; pricePerPersonINR = 22_000 },
      { label = "Super Deluxe"; pricePerPersonINR = 31_000 },
    ];

    let _ = insertPackageRecord({
      id = 0;
      categoryId = catPrivate;
      name = "Manali-Spiti Circuit";
      shortDescription = "10-day circuit through Pin Valley, Chandratal, and Key Monastery.";
      heroImageUrl = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&fit=crop";
      active = true;
      detail = #private({
        minGroupSize = 1;
        maxGroupSize = 20;
        pricing = #multi({ tiers });
        addOns = privateAddOns;
        itineraryDays = [
          "Arrive Chandigarh, drive to Manali. Evening walk on Mall Road.";
          "Cross Rohtang / Atal Tunnel, reach Kaza. Acclimatisation evening.";
          "Pin Valley monastery visit, village walk, overnight in Kaza.";
          "Chandratal Lake day excursion; camp or guesthouse.";
          "Return leg via Kunzum La; night near Manali.";
          "Departure after breakfast.";
        ];
      });
    });

    let _ = insertPackageRecord({
      id = 0;
      categoryId = catPrivate;
      name = "Leh Ladakh Adventure";
      shortDescription = "12-day adventure: Pangong, Nubra, Khardung La, Magnetic Hill.";
      heroImageUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&fit=crop";
      active = true;
      detail = #private({
        minGroupSize = 1;
        maxGroupSize = 20;
        pricing = #multi({ tiers });
        addOns = privateAddOns;
        itineraryDays = [
          "Fly to Leh, rest and light acclimatisation. Oxygen on standby.";
          "Sham Valley monasteries: Likir, Alchi, Magnetic Hill.";
          "Khardung La and Nubra Valley; double-hump camel ride (optional).";
          "Pangong Tso full day; lakeside stay.";
          "Return to Leh via Chang La; evening bazaar.";
          "Leh palace & Shanti Stupa; departure.";
        ];
      });
    });

    func mkBatch(date : Text, total : Nat, remaining : Nat) : FixedBatch {
      let bid = nextGlobalBatchId;
      nextGlobalBatchId += 1;
      { batchId = bid; dateLabel = date; seatsTotal = total; seatsRemaining = remaining };
    };

    let _ = insertPackageRecord({
      id = 0;
      categoryId = catFixed;
      name = "Golden Triangle";
      shortDescription = "7-day classic Delhi – Agra – Jaipur route.";
      heroImageUrl = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&fit=crop";
      active = true;
      detail = #fixed({
        pricePerPersonINR = 12_500;
        batches = [
          mkBatch("Apr 10, 2026", 8, 8),
          mkBatch("May 5, 2026", 14, 14),
          mkBatch("Jun 1, 2026", 2, 2),
        ];
        addOns = [];
        inclusions = [
          "Hotel stay (twin sharing)";
          "Daily breakfast";
          "AC vehicle for sightseeing";
          "English-speaking guide";
        ];
      });
    });

    let _ = insertPackageRecord({
      id = 0;
      categoryId = catFixed;
      name = "Kerala Backwaters";
      shortDescription = "6-day houseboats and coastal Kerala.";
      heroImageUrl = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&fit=crop";
      active = true;
      detail = #fixed({
        pricePerPersonINR = 15_000;
        batches = [
          mkBatch("Apr 15, 2026", 6, 6),
          mkBatch("May 20, 2026", 12, 12),
        ];
        addOns = [];
        inclusions = [
          "Houseboat stay with meals";
          "Airport / station transfers";
          "Shikara ride";
          "All taxes as per itinerary";
        ];
      });
    });

    let _ = insertPackageRecord({
      id = 0;
      categoryId = catFixed;
      name = "Rajasthan Heritage";
      shortDescription = "8-day palaces and desert heritage.";
      heroImageUrl = "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&fit=crop";
      active = true;
      detail = #fixed({
        pricePerPersonINR = 18_000;
        batches = [
          mkBatch("Apr 20, 2026", 10, 10),
          mkBatch("May 15, 2026", 12, 0),
          mkBatch("Jun 10, 2026", 5, 5),
        ];
        addOns = [];
        inclusions = [
          "Heritage hotels & haveli stays";
          "Breakfast daily; select dinners";
          "Private vehicle with driver";
          "Monument entry fees (as listed)";
        ];
      });
    });
  };

  public shared ({ caller }) func createCatalogBooking(
    packageId : Nat,
    batchIdOpt : ?Nat,
    tierIndexOpt : ?Nat,
    travelDate : Text,
    groupSize : Nat,
    selectedAddOnIds : [Nat],
    customerName : Text,
    customerEmail : Text,
    customerPhone : Text,
    claimedTotalPriceINR : Nat,
  ) : async Nat {
    if (customerName == "") Runtime.trap("Customer name cannot be empty");
    if (customerEmail == "") Runtime.trap("Customer email cannot be empty");
    if (customerPhone == "") Runtime.trap("Customer phone cannot be empty");
    if (travelDate == "") Runtime.trap("Travel date cannot be empty");
    if (groupSize == 0) Runtime.trap("Group size must be greater than 0");
    if (claimedTotalPriceINR == 0) Runtime.trap("Total price must be greater than 0");

    switch (packages.get(packageId)) {
      case (null) { Runtime.trap("Package not found") };
      case (?pkg) {
        if (not pkg.active) Runtime.trap("Package inactive");
        let catName = categoryNameOrTrap(pkg.categoryId);

        let (basePerPerson : Nat, addOnLabelsArr : [Text], displayName : Text, batchIdStore : ?Nat, tierStore : ?Nat) = switch (pkg.detail) {
          case (#private p) {
            if (groupSize < p.minGroupSize or groupSize > p.maxGroupSize) {
              Runtime.trap("Group size out of range");
            };
            let pricePP = switch (p.pricing) {
              case (#single s) {
                switch (tierIndexOpt) {
                  case (?_) { Runtime.trap("Tier not applicable") };
                  case (null) {};
                };
                s.pricePerPersonINR;
              };
              case (#multi m) {
                switch (tierIndexOpt) {
                  case (null) { Runtime.trap("Select a tier") };
                  case (?ti) {
                    if (ti >= m.tiers.size()) Runtime.trap("Invalid tier");
                    m.tiers[ti].pricePerPersonINR;
                  };
                };
              };
            };
            let tierLabel = switch (tierIndexOpt) {
              case (null) { "" };
              case (?ti) {
                switch (p.pricing) {
                  case (#single _) { "" };
                  case (#multi m) {
                    if (ti < m.tiers.size()) {
                      m.tiers[ti].label;
                    } else {
                      "";
                    };
                  };
                };
              };
            };
            let addSum = sumAddOnPrices(p.addOns, selectedAddOnIds);
            let labels = addOnLabels(p.addOns, selectedAddOnIds);
            let dn = if (tierLabel == "") {
              pkg.name;
            } else {
              pkg.name # " — " # tierLabel;
            };
            (pricePP + addSum, labels, dn, null, tierIndexOpt);
          };
          case (#fixed f) {
            switch (batchIdOpt) {
              case (null) { Runtime.trap("Select a departure batch") };
              case (?bid) {
                switch (findBatch(f, bid)) {
                  case (null) { Runtime.trap("Invalid batch") };
                  case (?b) {
                    if (groupSize > b.seatsRemaining) {
                      Runtime.trap("Not enough seats");
                    };
                    let addSum = sumAddOnPrices(f.addOns, selectedAddOnIds);
                    let labels = addOnLabels(f.addOns, selectedAddOnIds);
                    (f.pricePerPersonINR + addSum, labels, pkg.name, ?bid, null);
                  };
                };
              };
            };
          };
        };

        let total = basePerPerson * groupSize;
        if (total != claimedTotalPriceINR) {
          Runtime.trap("Price mismatch — refresh and try again");
        };

        switch (pkg.detail) {
          case (#private _) {};
          case (#fixed _) {
            switch (batchIdStore) {
              case (null) {};
              case (?bid) {
                let updatedPkg = takeSeatsFromBatch(pkg, bid, groupSize);
                packages.add(packageId, updatedPkg);
              };
            };
          };
        };

        let booking : Booking = {
          bookingId = nextBookingId;
          packageCategory = catName;
          packageName = displayName;
          customerName;
          customerEmail;
          customerPhone;
          travelDate;
          groupSize;
          addOns = addOnLabelsArr;
          totalPriceINR = total;
          status = #pending;
          createdTimestamp = Time.now();
          catalogPackageId = packageId;
          catalogBatchId = batchIdStore;
          catalogTierIndex = tierStore;
        };

        bookings.add(nextBookingId, booking);
        let existingIds = switch (bookingsByEmail.get(customerEmail)) {
          case (?ids) { ids };
          case (null) { [] };
        };
        bookingsByEmail.add(customerEmail, Array.append(existingIds, [nextBookingId]));
        let id = nextBookingId;
        nextBookingId += 1;
        id;
      };
    };
  };

  public shared ({ caller }) func createBooking(
    packageCategory : Text,
    packageName : Text,
    customerName : Text,
    customerEmail : Text,
    customerPhone : Text,
    travelDate : Text,
    groupSize : Nat,
    addOns : [Text],
    totalPriceINR : Nat,
  ) : async Nat {
    if (packageCategory == "") Runtime.trap("Package category cannot be empty");
    if (packageName == "") Runtime.trap("Package name cannot be empty");
    if (customerName == "") Runtime.trap("Customer name cannot be empty");
    if (customerEmail == "") Runtime.trap("Customer email cannot be empty");
    if (customerPhone == "") Runtime.trap("Customer phone cannot be empty");
    if (travelDate == "") Runtime.trap("Travel date cannot be empty");
    if (groupSize == 0) Runtime.trap("Group size must be greater than 0");
    if (totalPriceINR == 0) Runtime.trap("Total price must be greater than 0");

    let booking : Booking = {
      bookingId = nextBookingId;
      packageCategory;
      packageName;
      customerName;
      customerEmail;
      customerPhone;
      travelDate;
      groupSize;
      addOns;
      totalPriceINR;
      status = #pending;
      createdTimestamp = Time.now();
      catalogPackageId = 0;
      catalogBatchId = null;
      catalogTierIndex = null;
    };

    bookings.add(nextBookingId, booking);
    let existingIds = switch (bookingsByEmail.get(customerEmail)) {
      case (?ids) { ids };
      case (null) { [] };
    };
    bookingsByEmail.add(customerEmail, Array.append(existingIds, [nextBookingId]));
    let id = nextBookingId;
    nextBookingId += 1;
    id;
  };

  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their bookings");
    };
    let userProfile = getCallerUserProfileInternal(caller);
    var acc : [Booking] = [];
    switch (bookingsByEmail.get(userProfile.email)) {
      case (null) {};
      case (?ids) {
        for (bid in ids.vals()) {
          switch (bookings.get(bid)) {
            case (null) {};
            case (?b) { acc := Array.append(acc, [b]) };
          };
        };
      };
    };
    acc;
  };

  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all bookings");
    };
    bookings.values().toArray();
  };

  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, newStatus : BookingStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update booking status");
    };
    switch (bookings.get(bookingId)) {
      case (null) {
        Runtime.trap("Booking not found. ");
      };
      case (?booking) {
        let prev = booking.status;
        let updatedBooking = { booking with status = newStatus };
        bookings.add(bookingId, updatedBooking);

        if (prev != #cancelled and newStatus == #cancelled) {
          switch (booking.catalogBatchId) {
            case (null) {};
            case (?bid) {
              if (booking.catalogPackageId != 0) {
                switch (packages.get(booking.catalogPackageId)) {
                  case (null) {};
                  case (?pkg) {
                    let restored = releaseSeatsToBatch(pkg, bid, booking.groupSize);
                    packages.add(booking.catalogPackageId, restored);
                  };
                };
              };
            };
          };
        };
      };
    };
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  func getCallerUserProfileInternal(caller : Principal) : UserProfile {
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found. ") };
      case (?profile) { profile };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    assert (profile.name.size() > 0);
    assert (profile.email.size() > 0);
    assert (profile.phone.size() > 0);
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    getCallerUserProfileInternal(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User profile not found. ") };
      case (?profile) { profile };
    };
  };
};
