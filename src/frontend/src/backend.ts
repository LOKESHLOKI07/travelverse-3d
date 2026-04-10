/* eslint-disable */

// @ts-nocheck

// Actor / Candid bindings (generated). Do not edit by hand.

import { Actor, HttpAgent, type HttpAgentOptions, type ActorConfig, type Agent, type ActorSubclass } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { idlFactory, type _SERVICE } from "./declarations/backend.did";
import type {
    Booking as _Booking,
    BookingStatus as _BookingStatus,
    Time as _Time,
    UserRole as _UserRole,
    CategoryView as _CategoryView,
    TourPackage as _TourPackage,
} from "./declarations/backend.did.d.ts";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
function some<T>(value: T): Some<T> {
    return {
        __kind__: "Some",
        value: value
    };
}
function none(): None {
    return {
        __kind__: "None"
    };
}
function isNone<T>(option: Option<T>): option is None {
    return option.__kind__ === "None";
}
function isSome<T>(option: Option<T>): option is Some<T> {
    return option.__kind__ === "Some";
}
function unwrap<T>(option: Option<T>): T {
    if (isNone(option)) {
        throw new Error("unwrap: none");
    }
    return option.value;
}
function candid_some<T>(value: T): [T] {
    return [
        value
    ];
}
function candid_none<T>(): [] {
    return [];
}
function record_opt_to_undefined<T>(arg: T | null): T | undefined {
    return arg == null ? undefined : arg;
}
export class ExternalBlob {
    _blob?: Uint8Array<ArrayBuffer> | null;
    directURL: string;
    onProgress?: (percentage: number) => void = undefined;
    private constructor(directURL: string, blob: Uint8Array<ArrayBuffer> | null){
        if (blob) {
            this._blob = blob;
        }
        this.directURL = directURL;
    }
    static fromURL(url: string): ExternalBlob {
        return new ExternalBlob(url, null);
    }
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob {
        const url = URL.createObjectURL(new Blob([
            new Uint8Array(blob)
        ], {
            type: 'application/octet-stream'
        }));
        return new ExternalBlob(url, blob);
    }
    public async getBytes(): Promise<Uint8Array<ArrayBuffer>> {
        if (this._blob) {
            return this._blob;
        }
        const response = await fetch(this.directURL);
        const blob = await response.blob();
        this._blob = new Uint8Array(await blob.arrayBuffer());
        return this._blob;
    }
    public getDirectURL(): string {
        return this.directURL;
    }
    public withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
        this.onProgress = onProgress;
        return this;
    }
}
export type {
    AddOnDef,
    CategoryRecord,
    CategoryView,
    FixedBatch,
    FixedCfg,
    PackageDetail,
    PrivateCfg,
    PrivatePricing,
    TourPackage,
} from "./declarations/backend.did.d.ts";
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
    listCatalog(): Promise<Array<_CategoryView>>;
    getPackage(packageId: bigint): Promise<_TourPackage | null>;
    adminUpsertCategory(
        id: bigint | undefined,
        name: string,
        sortOrder: bigint,
        active: boolean,
    ): Promise<bigint>;
    adminDeleteCategory(categoryId: bigint): Promise<void>;
    adminPutPackage(pkg: _TourPackage): Promise<bigint>;
    adminDeletePackage(packageId: bigint): Promise<void>;
    adminReserveBatchIds(count: bigint): Promise<Array<bigint>>;
    adminSeedDemoCatalog(): Promise<void>;
    /** Node dev API only: clears catalog then inserts full demo data (requires admin). */
    adminReplaceDemoCatalog?(): Promise<void>;
    getAllBookings(): Promise<Array<Booking>>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getMyBookings(): Promise<Array<Booking>>;
    getUserProfile(user: Principal): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBookingStatus(bookingId: bigint, newStatus: BookingStatus): Promise<void>;
}
export class Backend implements backendInterface {
    constructor(private actor: ActorSubclass<_SERVICE>, private _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, private _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, private processError?: (error: unknown) => never){}
    async _initializeAccessControlWithSecret(arg0: string): Promise<void> {
        if (this.processError) {
            try {
                const result = await this.actor._initializeAccessControlWithSecret(arg0);
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor._initializeAccessControlWithSecret(arg0);
            return result;
        }
    }
    async assignCallerUserRole(arg0: Principal, arg1: UserRole): Promise<void> {
        if (this.processError) {
            try {
                const result = await this.actor.assignCallerUserRole(arg0, to_candid_UserRole_n1(this._uploadFile, this._downloadFile, arg1));
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.assignCallerUserRole(arg0, to_candid_UserRole_n1(this._uploadFile, this._downloadFile, arg1));
            return result;
        }
    }
    async createBooking(arg0: string, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string, arg6: bigint, arg7: Array<string>, arg8: bigint): Promise<bigint> {
        if (this.processError) {
            try {
                const result = await this.actor.createBooking(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.createBooking(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            return result;
        }
    }
    async getAllBookings(): Promise<Array<Booking>> {
        if (this.processError) {
            try {
                const result = await this.actor.getAllBookings();
                return from_candid_vec_n3(this._uploadFile, this._downloadFile, result);
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.getAllBookings();
            return from_candid_vec_n3(this._uploadFile, this._downloadFile, result);
        }
    }
    async getCallerUserProfile(): Promise<UserProfile> {
        if (this.processError) {
            try {
                const result = await this.actor.getCallerUserProfile();
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.getCallerUserProfile();
            return result;
        }
    }
    async getCallerUserRole(): Promise<UserRole> {
        if (this.processError) {
            try {
                const result = await this.actor.getCallerUserRole();
                return from_candid_UserRole_n8(this._uploadFile, this._downloadFile, result);
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.getCallerUserRole();
            return from_candid_UserRole_n8(this._uploadFile, this._downloadFile, result);
        }
    }
    async getMyBookings(): Promise<Array<Booking>> {
        if (this.processError) {
            try {
                const result = await this.actor.getMyBookings();
                return from_candid_vec_n3(this._uploadFile, this._downloadFile, result);
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.getMyBookings();
            return from_candid_vec_n3(this._uploadFile, this._downloadFile, result);
        }
    }
    async getUserProfile(arg0: Principal): Promise<UserProfile> {
        if (this.processError) {
            try {
                const result = await this.actor.getUserProfile(arg0);
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.getUserProfile(arg0);
            return result;
        }
    }
    async isCallerAdmin(): Promise<boolean> {
        if (this.processError) {
            try {
                const result = await this.actor.isCallerAdmin();
                return result;
            } catch (e) {
                console.error(
                    "[tourist admin] canister isCallerAdmin query failed (trap, reject, or agent error)",
                    { rawError: e },
                );
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.isCallerAdmin();
            return result;
        }
    }
    async saveCallerUserProfile(arg0: UserProfile): Promise<void> {
        if (this.processError) {
            try {
                const result = await this.actor.saveCallerUserProfile(arg0);
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.saveCallerUserProfile(arg0);
            return result;
        }
    }
    async updateBookingStatus(arg0: bigint, arg1: BookingStatus): Promise<void> {
        if (this.processError) {
            try {
                const result = await this.actor.updateBookingStatus(arg0, to_candid_BookingStatus_n10(this._uploadFile, this._downloadFile, arg1));
                return result;
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        } else {
            const result = await this.actor.updateBookingStatus(arg0, to_candid_BookingStatus_n10(this._uploadFile, this._downloadFile, arg1));
            return result;
        }
    }
    async createCatalogBooking(
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
    ): Promise<bigint> {
        const run = () =>
            this.actor.createCatalogBooking(
                packageId,
                batchId === undefined ? [] : [batchId],
                tierIndex === undefined ? [] : [tierIndex],
                travelDate,
                groupSize,
                selectedAddOnIds,
                customerName,
                customerEmail,
                customerPhone,
                claimedTotalPriceINR,
            );
        if (this.processError) {
            try {
                return await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return await run();
    }
    async listCatalog(): Promise<Array<_CategoryView>> {
        const run = () => this.actor.listCatalog();
        if (this.processError) {
            try {
                return await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return await run();
    }
    async getPackage(packageId: bigint): Promise<_TourPackage | null> {
        const run = () => this.actor.getPackage(packageId);
        if (this.processError) {
            try {
                const r = await run();
                return unwrapOptTourPackage(r);
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return unwrapOptTourPackage(await run());
    }
    async adminUpsertCategory(
        id: bigint | undefined,
        name: string,
        sortOrder: bigint,
        active: boolean,
    ): Promise<bigint> {
        const run = () =>
            this.actor.adminUpsertCategory(
                id === undefined ? [] : [id],
                name,
                sortOrder,
                active,
            );
        if (this.processError) {
            try {
                return await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return await run();
    }
    async adminDeleteCategory(categoryId: bigint): Promise<void> {
        const run = () => this.actor.adminDeleteCategory(categoryId);
        if (this.processError) {
            try {
                await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
            return;
        }
        await run();
    }
    async adminPutPackage(pkg: _TourPackage): Promise<bigint> {
        const run = () => this.actor.adminPutPackage(pkg);
        if (this.processError) {
            try {
                return await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return await run();
    }
    async adminDeletePackage(packageId: bigint): Promise<void> {
        const run = () => this.actor.adminDeletePackage(packageId);
        if (this.processError) {
            try {
                await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
            return;
        }
        await run();
    }
    async adminReserveBatchIds(count: bigint): Promise<Array<bigint>> {
        const run = () => this.actor.adminReserveBatchIds(count);
        if (this.processError) {
            try {
                return await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
        }
        return await run();
    }
    async adminSeedDemoCatalog(): Promise<void> {
        const run = () => this.actor.adminSeedDemoCatalog();
        if (this.processError) {
            try {
                await run();
            } catch (e) {
                this.processError(e);
                throw new Error("unreachable");
            }
            return;
        }
        await run();
    }
}
function unwrapOptTourPackage(r: unknown): _TourPackage | null {
    if (r === null || r === undefined) return null;
    if (Array.isArray(r)) {
        if (r.length === 0) return null;
        return r[0] as _TourPackage;
    }
    return r as _TourPackage;
}
function from_candid_BookingStatus_n6(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: _BookingStatus): BookingStatus {
    return from_candid_variant_n7(_uploadFile, _downloadFile, value);
}
function from_candid_Booking_n4(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: _Booking): Booking {
    return from_candid_record_n5(_uploadFile, _downloadFile, value);
}
function from_candid_UserRole_n8(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: _UserRole): UserRole {
    return from_candid_variant_n9(_uploadFile, _downloadFile, value);
}
function unwrapOptNat(v: [] | [bigint] | undefined | null): bigint | undefined {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v) && v.length === 0) return undefined;
    return v[0];
}
function from_candid_record_n5(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: _Booking): Booking {
    const catalogBatchId = unwrapOptNat(value.catalogBatchId);
    const catalogTierIndex = unwrapOptNat(value.catalogTierIndex);
    return {
        customerName: value.customerName,
        packageName: value.packageName,
        status: from_candid_BookingStatus_n6(_uploadFile, _downloadFile, value.status),
        bookingId: value.bookingId,
        customerPhone: value.customerPhone,
        packageCategory: value.packageCategory,
        addOns: value.addOns,
        createdTimestamp: value.createdTimestamp,
        travelDate: value.travelDate,
        groupSize: value.groupSize,
        customerEmail: value.customerEmail,
        totalPriceINR: value.totalPriceINR,
        catalogPackageId: value.catalogPackageId,
        catalogBatchId,
        catalogTierIndex,
    };
}
function from_candid_variant_n7(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: {
    cancelled: null;
} | {
    pending: null;
} | {
    confirmed: null;
}): BookingStatus {
    return "cancelled" in value ? BookingStatus.cancelled : "pending" in value ? BookingStatus.pending : "confirmed" in value ? BookingStatus.confirmed : value;
}
function from_candid_variant_n9(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: {
    admin: null;
} | {
    user: null;
} | {
    guest: null;
}): UserRole {
    return "admin" in value ? UserRole.admin : "user" in value ? UserRole.user : "guest" in value ? UserRole.guest : value;
}
function from_candid_vec_n3(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: Array<_Booking>): Array<Booking> {
    return value.map((x)=>from_candid_Booking_n4(_uploadFile, _downloadFile, x));
}
function to_candid_BookingStatus_n10(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: BookingStatus): _BookingStatus {
    return to_candid_variant_n11(_uploadFile, _downloadFile, value);
}
function to_candid_UserRole_n1(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: UserRole): _UserRole {
    return to_candid_variant_n2(_uploadFile, _downloadFile, value);
}
function to_candid_variant_n11(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: BookingStatus): {
    cancelled: null;
} | {
    pending: null;
} | {
    confirmed: null;
} {
    return value == BookingStatus.cancelled ? {
        cancelled: null
    } : value == BookingStatus.pending ? {
        pending: null
    } : value == BookingStatus.confirmed ? {
        confirmed: null
    } : value;
}
function to_candid_variant_n2(_uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, value: UserRole): {
    admin: null;
} | {
    user: null;
} | {
    guest: null;
} {
    return value == UserRole.admin ? {
        admin: null
    } : value == UserRole.user ? {
        user: null
    } : value == UserRole.guest ? {
        guest: null
    } : value;
}
export interface CreateActorOptions {
    agent?: Agent;
    agentOptions?: HttpAgentOptions;
    actorOptions?: ActorConfig;
    processError?: (error: unknown) => never;
}
export function createActor(canisterId: string, _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, options: CreateActorOptions = {}): Backend {
    const agent = options.agent || HttpAgent.createSync({
        ...options.agentOptions
    });
    if (options.agent && options.agentOptions) {
        console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
    }
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: canisterId,
        ...options.actorOptions
    });
    return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
