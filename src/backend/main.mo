import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";

import Iter "mo:core/Iter";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  let bookings = Map.empty<Nat, Booking>();
  let bookingsByEmail = Map.empty<Text, [Nat]>();

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
  };

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextBookingId = 1;

  // Create a new booking, open to all users
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
    // Input validation (optional, can be expanded)
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
    };

    bookings.add(nextBookingId, booking);

    let existingIds = switch (bookingsByEmail.get(customerEmail)) {
      case (?ids) { ids };
      case (null) { [] };
    };
    bookingsByEmail.add(customerEmail, existingIds.concat([nextBookingId]));

    nextBookingId += 1;
    booking.bookingId;
  };

  // Get all bookings for the caller's email
  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their bookings");
    };
    let userProfile = getCallerUserProfileInternal(caller);
    let userBookings = switch (bookingsByEmail.get(userProfile.email)) {
      case (?ids) {
        ids.map(func(id) { bookings.get(id) }).filter(func(b) { b != null }).map(func(b) { b.unwrap() });
      };
      case (null) { [] };
    };
    userBookings;
  };

  // Get all bookings (admin only)
  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all bookings");
    };
    bookings.values().toArray();
  };

  // Update booking status (admin only)
  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, newStatus : BookingStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update booking status");
    };
    switch (bookings.get(bookingId)) {
      case (null) {
        Runtime.trap("Booking not found. ");
      };
      case (?booking) {
        let updatedBooking = { booking with status = newStatus };
        bookings.add(bookingId, updatedBooking);
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
