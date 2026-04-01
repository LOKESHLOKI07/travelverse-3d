/* eslint-disable */

// @ts-nocheck

// Candid IDL bindings (generated). Do not edit by hand.

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Booking {
  'customerName' : string,
  'packageName' : string,
  'status' : BookingStatus,
  'bookingId' : bigint,
  'customerPhone' : string,
  'packageCategory' : string,
  'addOns' : Array<string>,
  'createdTimestamp' : Time,
  'travelDate' : string,
  'groupSize' : bigint,
  'customerEmail' : string,
  'totalPriceINR' : bigint,
}
export type BookingStatus = { 'cancelled' : null } |
  { 'pending' : null } |
  { 'confirmed' : null };
export type Time = bigint;
export interface UserProfile {
  'name' : string,
  'email' : string,
  'phone' : string,
}
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface _SERVICE {
  '_initializeAccessControlWithSecret' : ActorMethod<[string], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createBooking' : ActorMethod<
    [
      string,
      string,
      string,
      string,
      string,
      string,
      bigint,
      Array<string>,
      bigint,
    ],
    bigint
  >,
  'getAllBookings' : ActorMethod<[], Array<Booking>>,
  'getCallerUserProfile' : ActorMethod<[], UserProfile>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getMyBookings' : ActorMethod<[], Array<Booking>>,
  'getUserProfile' : ActorMethod<[Principal], UserProfile>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'updateBookingStatus' : ActorMethod<[bigint, BookingStatus], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];