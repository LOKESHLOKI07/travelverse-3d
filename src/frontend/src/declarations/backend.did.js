/* eslint-disable */

// @ts-nocheck

// Candid IDL — keep in sync with src/backend/main.mo

import { IDL } from '@icp-sdk/core/candid';

export const UserRole = IDL.Variant({
  admin: IDL.Null,
  user: IDL.Null,
  guest: IDL.Null,
});
export const BookingStatus = IDL.Variant({
  cancelled: IDL.Null,
  pending: IDL.Null,
  confirmed: IDL.Null,
});
export const Time = IDL.Int;

export const AddOnDef = IDL.Record({
  addOnId: IDL.Nat,
  label: IDL.Text,
  priceINR: IDL.Nat,
});
export const PrivatePricing = IDL.Variant({
  single: IDL.Record({ pricePerPersonINR: IDL.Nat }),
  multi: IDL.Record({
    tiers: IDL.Vec(
      IDL.Record({ label: IDL.Text, pricePerPersonINR: IDL.Nat }),
    ),
  }),
});
export const PrivateCfg = IDL.Record({
  minGroupSize: IDL.Nat,
  maxGroupSize: IDL.Nat,
  pricing: PrivatePricing,
  addOns: IDL.Vec(AddOnDef),
});
export const FixedBatch = IDL.Record({
  batchId: IDL.Nat,
  dateLabel: IDL.Text,
  seatsTotal: IDL.Nat,
  seatsRemaining: IDL.Nat,
});
export const FixedCfg = IDL.Record({
  pricePerPersonINR: IDL.Nat,
  batches: IDL.Vec(FixedBatch),
  addOns: IDL.Vec(AddOnDef),
});
export const PackageDetail = IDL.Variant({
  private: PrivateCfg,
  fixed: FixedCfg,
});
export const TourPackage = IDL.Record({
  id: IDL.Nat,
  categoryId: IDL.Nat,
  name: IDL.Text,
  shortDescription: IDL.Text,
  heroImageUrl: IDL.Text,
  active: IDL.Bool,
  detail: PackageDetail,
});
export const CategoryRecord = IDL.Record({
  id: IDL.Nat,
  name: IDL.Text,
  sortOrder: IDL.Nat,
  active: IDL.Bool,
});
export const CategoryView = IDL.Record({
  category: CategoryRecord,
  packages: IDL.Vec(TourPackage),
});

export const Booking = IDL.Record({
  bookingId: IDL.Nat,
  packageCategory: IDL.Text,
  packageName: IDL.Text,
  customerName: IDL.Text,
  customerEmail: IDL.Text,
  customerPhone: IDL.Text,
  travelDate: IDL.Text,
  groupSize: IDL.Nat,
  addOns: IDL.Vec(IDL.Text),
  totalPriceINR: IDL.Nat,
  status: BookingStatus,
  createdTimestamp: Time,
  catalogPackageId: IDL.Nat,
  catalogBatchId: IDL.Opt(IDL.Nat),
  catalogTierIndex: IDL.Opt(IDL.Nat),
});
export const UserProfile = IDL.Record({
  name: IDL.Text,
  email: IDL.Text,
  phone: IDL.Text,
});

export const idlService = IDL.Service({
  _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
  assignCallerUserRole: IDL.Func([IDL.Principal, UserRole], [], []),
  createBooking: IDL.Func(
    [
      IDL.Text,
      IDL.Text,
      IDL.Text,
      IDL.Text,
      IDL.Text,
      IDL.Text,
      IDL.Nat,
      IDL.Vec(IDL.Text),
      IDL.Nat,
    ],
    [IDL.Nat],
    [],
  ),
  createCatalogBooking: IDL.Func(
    [
      IDL.Nat,
      IDL.Opt(IDL.Nat),
      IDL.Opt(IDL.Nat),
      IDL.Text,
      IDL.Nat,
      IDL.Vec(IDL.Nat),
      IDL.Text,
      IDL.Text,
      IDL.Text,
      IDL.Nat,
    ],
    [IDL.Nat],
    [],
  ),
  listCatalog: IDL.Func([], [IDL.Vec(CategoryView)], ['query']),
  getPackage: IDL.Func([IDL.Nat], [IDL.Opt(TourPackage)], ['query']),
  adminUpsertCategory: IDL.Func(
    [IDL.Opt(IDL.Nat), IDL.Text, IDL.Nat, IDL.Bool],
    [IDL.Nat],
    [],
  ),
  adminDeleteCategory: IDL.Func([IDL.Nat], [], []),
  adminPutPackage: IDL.Func([TourPackage], [IDL.Nat], []),
  adminDeletePackage: IDL.Func([IDL.Nat], [], []),
  adminReserveBatchIds: IDL.Func([IDL.Nat], [IDL.Vec(IDL.Nat)], []),
  adminSeedDemoCatalog: IDL.Func([], [], []),
  getAllBookings: IDL.Func([], [IDL.Vec(Booking)], ['query']),
  getCallerUserProfile: IDL.Func([], [UserProfile], ['query']),
  getCallerUserRole: IDL.Func([], [UserRole], ['query']),
  getMyBookings: IDL.Func([], [IDL.Vec(Booking)], ['query']),
  getUserProfile: IDL.Func([IDL.Principal], [UserProfile], ['query']),
  isCallerAdmin: IDL.Func([], [IDL.Bool], ['query']),
  saveCallerUserProfile: IDL.Func([UserProfile], [], []),
  updateBookingStatus: IDL.Func([IDL.Nat, BookingStatus], [], []),
});

export const idlInitArgs = [];

function buildTypes(IDL) {
  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });
  const BookingStatus = IDL.Variant({
    cancelled: IDL.Null,
    pending: IDL.Null,
    confirmed: IDL.Null,
  });
  const Time = IDL.Int;
  const AddOnDef = IDL.Record({
    addOnId: IDL.Nat,
    label: IDL.Text,
    priceINR: IDL.Nat,
  });
  const PrivatePricing = IDL.Variant({
    single: IDL.Record({ pricePerPersonINR: IDL.Nat }),
    multi: IDL.Record({
      tiers: IDL.Vec(
        IDL.Record({ label: IDL.Text, pricePerPersonINR: IDL.Nat }),
      ),
    }),
  });
  const PrivateCfg = IDL.Record({
    minGroupSize: IDL.Nat,
    maxGroupSize: IDL.Nat,
    pricing: PrivatePricing,
    addOns: IDL.Vec(AddOnDef),
  });
  const FixedBatch = IDL.Record({
    batchId: IDL.Nat,
    dateLabel: IDL.Text,
    seatsTotal: IDL.Nat,
    seatsRemaining: IDL.Nat,
  });
  const FixedCfg = IDL.Record({
    pricePerPersonINR: IDL.Nat,
    batches: IDL.Vec(FixedBatch),
    addOns: IDL.Vec(AddOnDef),
  });
  const PackageDetail = IDL.Variant({
    private: PrivateCfg,
    fixed: FixedCfg,
  });
  const TourPackage = IDL.Record({
    id: IDL.Nat,
    categoryId: IDL.Nat,
    name: IDL.Text,
    shortDescription: IDL.Text,
    heroImageUrl: IDL.Text,
    active: IDL.Bool,
    detail: PackageDetail,
  });
  const CategoryRecord = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    sortOrder: IDL.Nat,
    active: IDL.Bool,
  });
  const CategoryView = IDL.Record({
    category: CategoryRecord,
    packages: IDL.Vec(TourPackage),
  });
  const Booking = IDL.Record({
    bookingId: IDL.Nat,
    packageCategory: IDL.Text,
    packageName: IDL.Text,
    customerName: IDL.Text,
    customerEmail: IDL.Text,
    customerPhone: IDL.Text,
    travelDate: IDL.Text,
    groupSize: IDL.Nat,
    addOns: IDL.Vec(IDL.Text),
    totalPriceINR: IDL.Nat,
    status: BookingStatus,
    createdTimestamp: Time,
    catalogPackageId: IDL.Nat,
    catalogBatchId: IDL.Opt(IDL.Nat),
    catalogTierIndex: IDL.Opt(IDL.Nat),
  });
  const UserProfile = IDL.Record({
    name: IDL.Text,
    email: IDL.Text,
    phone: IDL.Text,
  });
  return {
    UserRole,
    BookingStatus,
    Time,
    Booking,
    UserProfile,
    CategoryView,
    TourPackage,
  };
}

export const idlFactory = ({ IDL }) => {
  const t = buildTypes(IDL);
  return IDL.Service({
    _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
    assignCallerUserRole: IDL.Func([IDL.Principal, t.UserRole], [], []),
    createBooking: IDL.Func(
      [
        IDL.Text,
        IDL.Text,
        IDL.Text,
        IDL.Text,
        IDL.Text,
        IDL.Text,
        IDL.Nat,
        IDL.Vec(IDL.Text),
        IDL.Nat,
      ],
      [IDL.Nat],
      [],
    ),
    createCatalogBooking: IDL.Func(
      [
        IDL.Nat,
        IDL.Opt(IDL.Nat),
        IDL.Opt(IDL.Nat),
        IDL.Text,
        IDL.Nat,
        IDL.Vec(IDL.Nat),
        IDL.Text,
        IDL.Text,
        IDL.Text,
        IDL.Nat,
      ],
      [IDL.Nat],
      [],
    ),
    listCatalog: IDL.Func([], [IDL.Vec(t.CategoryView)], ['query']),
    getPackage: IDL.Func([IDL.Nat], [IDL.Opt(t.TourPackage)], ['query']),
    adminUpsertCategory: IDL.Func(
      [IDL.Opt(IDL.Nat), IDL.Text, IDL.Nat, IDL.Bool],
      [IDL.Nat],
      [],
    ),
    adminDeleteCategory: IDL.Func([IDL.Nat], [], []),
    adminPutPackage: IDL.Func([t.TourPackage], [IDL.Nat], []),
    adminDeletePackage: IDL.Func([IDL.Nat], [], []),
    adminReserveBatchIds: IDL.Func([IDL.Nat], [IDL.Vec(IDL.Nat)], []),
    adminSeedDemoCatalog: IDL.Func([], [], []),
    getAllBookings: IDL.Func([], [IDL.Vec(t.Booking)], ['query']),
    getCallerUserProfile: IDL.Func([], [t.UserProfile], ['query']),
    getCallerUserRole: IDL.Func([], [t.UserRole], ['query']),
    getMyBookings: IDL.Func([], [IDL.Vec(t.Booking)], ['query']),
    getUserProfile: IDL.Func([IDL.Principal], [t.UserProfile], ['query']),
    isCallerAdmin: IDL.Func([], [IDL.Bool], ['query']),
    saveCallerUserProfile: IDL.Func([t.UserProfile], [], []),
    updateBookingStatus: IDL.Func([IDL.Nat, t.BookingStatus], [], []),
  });
};

export const init = ({ IDL }) => {
  return [];
};
