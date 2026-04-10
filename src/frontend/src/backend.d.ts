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
    catalogPackageId: bigint;
    catalogBatchId?: bigint;
    catalogTierIndex?: bigint;
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
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createBooking(packageCategory: string, packageName: string, customerName: string, customerEmail: string, customerPhone: string, travelDate: string, groupSize: bigint, addOns: Array<string>, totalPriceINR: bigint): Promise<bigint>;
    createCatalogBooking(
        packageId: bigint,
        batchId: bigint | undefined,
        tierIndex: bigint | undefined,
        travelDate: string,
        groupSize: bigint,
        selectedAddOnIds: Array<bigint>,
        customerName: string,
        customerEmail: string,
        customerPhone: string,
        claimedTotalPriceINR: bigint,
    ): Promise<bigint>;
    listCatalog(): Promise<Array<unknown>>;
    getPackage(packageId: bigint): Promise<unknown>;
    adminUpsertCategory(
        id: bigint | undefined,
        name: string,
        sortOrder: bigint,
        active: boolean,
    ): Promise<bigint>;
    adminDeleteCategory(categoryId: bigint): Promise<void>;
    adminPutPackage(pkg: unknown): Promise<bigint>;
    adminDeletePackage(packageId: bigint): Promise<void>;
    adminReserveBatchIds(count: bigint): Promise<Array<bigint>>;
    adminSeedDemoCatalog(): Promise<void>;
    adminReplaceDemoCatalog?(): Promise<void>;
    getAllBookings(): Promise<Booking[]>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getMyBookings(): Promise<Array<Booking>>;
    getUserProfile(user: Principal): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBookingStatus(bookingId: bigint, newStatus: BookingStatus): Promise<void>;
}
