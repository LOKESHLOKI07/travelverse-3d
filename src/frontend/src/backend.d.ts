import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Booking {
    customerName: string;
    packageName: string;
    status: BookingStatus;
    bookingId: bigint;
    customerPhone: string;
    packageCategory: string;
    addOns: Array<string>;
    createdTimestamp: Time;
    travelDate: string;
    groupSize: bigint;
    customerEmail: string;
    totalPriceINR: bigint;
}
export type Time = bigint;
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending",
    confirmed = "confirmed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createBooking(packageCategory: string, packageName: string, customerName: string, customerEmail: string, customerPhone: string, travelDate: string, groupSize: bigint, addOns: Array<string>, totalPriceINR: bigint): Promise<bigint>;
    getAllBookings(): Promise<Array<Booking>>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getMyBookings(): Promise<Array<Booking>>;
    getUserProfile(user: Principal): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBookingStatus(bookingId: bigint, newStatus: BookingStatus): Promise<void>;
}
