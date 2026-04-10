/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type AddOnDef = {
  addOnId: bigint;
  label: string;
  priceINR: bigint;
};
export type PrivatePricing =
  | { single: { pricePerPersonINR: bigint } }
  | { multi: { tiers: Array<{ label: string; pricePerPersonINR: bigint }> } };
export type PrivateCfg = {
  minGroupSize: bigint;
  maxGroupSize: bigint;
  pricing: PrivatePricing;
  addOns: Array<AddOnDef>;
};
export type FixedBatch = {
  batchId: bigint;
  dateLabel: string;
  seatsTotal: bigint;
  seatsRemaining: bigint;
};
export type FixedCfg = {
  pricePerPersonINR: bigint;
  batches: Array<FixedBatch>;
  addOns: Array<AddOnDef>;
};
export type PackageDetail = { private: PrivateCfg } | { fixed: FixedCfg };
export type TourPackage = {
  id: bigint;
  categoryId: bigint;
  name: string;
  shortDescription: string;
  heroImageUrl: string;
  active: boolean;
  detail: PackageDetail;
};
export type CategoryRecord = {
  id: bigint;
  name: string;
  sortOrder: bigint;
  active: boolean;
};
export type CategoryView = {
  category: CategoryRecord;
  packages: Array<TourPackage>;
};

export interface Booking {
  bookingId: bigint;
  packageCategory: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelDate: string;
  groupSize: bigint;
  addOns: Array<string>;
  totalPriceINR: bigint;
  status: BookingStatus;
  createdTimestamp: Time;
  catalogPackageId: bigint;
  catalogBatchId: [] | [bigint];
  catalogTierIndex: [] | [bigint];
}
export type BookingStatus =
  | { cancelled: null }
  | { pending: null }
  | { confirmed: null };
export type Time = bigint;
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}
export type UserRole =
  | { admin: null }
  | { user: null }
  | { guest: null };

export interface _SERVICE {
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], undefined>;
  createBooking: ActorMethod<
    [string, string, string, string, string, string, bigint, Array<string>, bigint],
    bigint
  >;
  createCatalogBooking: ActorMethod<
    [
      bigint,
      [] | [bigint],
      [] | [bigint],
      string,
      bigint,
      Array<bigint>,
      string,
      string,
      string,
      bigint,
    ],
    bigint
  >;
  listCatalog: ActorMethod<[], Array<CategoryView>>;
  getPackage: ActorMethod<[bigint], [[]] | [[TourPackage]]>;
  adminUpsertCategory: ActorMethod<
    [[] | [bigint], string, bigint, boolean],
    bigint
  >;
  adminDeleteCategory: ActorMethod<[bigint], undefined>;
  adminPutPackage: ActorMethod<[TourPackage], bigint>;
  adminDeletePackage: ActorMethod<[bigint], undefined>;
  adminReserveBatchIds: ActorMethod<[bigint], Array<bigint>>;
  adminSeedDemoCatalog: ActorMethod<[], undefined>;
  getAllBookings: ActorMethod<[], Array<Booking>>;
  getCallerUserProfile: ActorMethod<[], UserProfile>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  getMyBookings: ActorMethod<[], Array<Booking>>;
  getUserProfile: ActorMethod<[Principal], UserProfile>;
  isCallerAdmin: ActorMethod<[], boolean>;
  saveCallerUserProfile: ActorMethod<[UserProfile], undefined>;
  updateBookingStatus: ActorMethod<[bigint, BookingStatus], undefined>;
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
