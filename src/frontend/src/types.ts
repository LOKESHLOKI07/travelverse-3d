export type Page =
  | "home"
  | "careers"
  | "partners"
  | "team"
  | "packages"
  | "package-detail"
  | "my-bookings"
  | "account"
  | "admin";

export interface PackageSearchFilters {
  destination: string;
  date: string;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
}
