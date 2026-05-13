export type Page =
  | "home"
  | "careers"
  | "partners"
  | "team"
  | "packages"
  | "package-detail"
  | "my-bookings"
  | "account"
  | "admin"
  | "treks-expeditions"
  | "private-packages"
  | "hotels"
  | "villas-farmhouses";

export interface PackageSearchFilters {
  destination: string;
  date: string;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  /** Limit browse results to these catalog listing kinds (unified / Node catalog). */
  catalogKinds?: Array<"private" | "fixed" | "trek" | "hotel" | "villa">;
}
