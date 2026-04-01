/* eslint-disable */

// @ts-nocheck

// Candid IDL bindings (generated). Do not edit by hand.

import { IDL } from '@icp-sdk/core/candid';

export const UserRole = IDL.Variant({
  'admin' : IDL.Null,
  'user' : IDL.Null,
  'guest' : IDL.Null,
});
export const BookingStatus = IDL.Variant({
  'cancelled' : IDL.Null,
  'pending' : IDL.Null,
  'confirmed' : IDL.Null,
});
export const Time = IDL.Int;
export const Booking = IDL.Record({
  'customerName' : IDL.Text,
  'packageName' : IDL.Text,
  'status' : BookingStatus,
  'bookingId' : IDL.Nat,
  'customerPhone' : IDL.Text,
  'packageCategory' : IDL.Text,
  'addOns' : IDL.Vec(IDL.Text),
  'createdTimestamp' : Time,
  'travelDate' : IDL.Text,
  'groupSize' : IDL.Nat,
  'customerEmail' : IDL.Text,
  'totalPriceINR' : IDL.Nat,
});
export const UserProfile = IDL.Record({
  'name' : IDL.Text,
  'email' : IDL.Text,
  'phone' : IDL.Text,
});

export const idlService = IDL.Service({
  '_initializeAccessControlWithSecret' : IDL.Func([IDL.Text], [], []),
  'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
  'createBooking' : IDL.Func(
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
  'getAllBookings' : IDL.Func([], [IDL.Vec(Booking)], ['query']),
  'getCallerUserProfile' : IDL.Func([], [UserProfile], ['query']),
  'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
  'getMyBookings' : IDL.Func([], [IDL.Vec(Booking)], ['query']),
  'getUserProfile' : IDL.Func([IDL.Principal], [UserProfile], ['query']),
  'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
  'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
  'updateBookingStatus' : IDL.Func([IDL.Nat, BookingStatus], [], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const BookingStatus = IDL.Variant({
    'cancelled' : IDL.Null,
    'pending' : IDL.Null,
    'confirmed' : IDL.Null,
  });
  const Time = IDL.Int;
  const Booking = IDL.Record({
    'customerName' : IDL.Text,
    'packageName' : IDL.Text,
    'status' : BookingStatus,
    'bookingId' : IDL.Nat,
    'customerPhone' : IDL.Text,
    'packageCategory' : IDL.Text,
    'addOns' : IDL.Vec(IDL.Text),
    'createdTimestamp' : Time,
    'travelDate' : IDL.Text,
    'groupSize' : IDL.Nat,
    'customerEmail' : IDL.Text,
    'totalPriceINR' : IDL.Nat,
  });
  const UserProfile = IDL.Record({
    'name' : IDL.Text,
    'email' : IDL.Text,
    'phone' : IDL.Text,
  });
  
  return IDL.Service({
    '_initializeAccessControlWithSecret' : IDL.Func([IDL.Text], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'createBooking' : IDL.Func(
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
    'getAllBookings' : IDL.Func([], [IDL.Vec(Booking)], ['query']),
    'getCallerUserProfile' : IDL.Func([], [UserProfile], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getMyBookings' : IDL.Func([], [IDL.Vec(Booking)], ['query']),
    'getUserProfile' : IDL.Func([IDL.Principal], [UserProfile], ['query']),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'updateBookingStatus' : IDL.Func([IDL.Nat, BookingStatus], [], []),
  });
};

export const init = ({ IDL }) => { return []; };