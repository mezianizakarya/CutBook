export type Role = "customer" | "barber" | "owner" | "admin";

export const ROLES: Role[] = ["customer", "barber", "owner", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  barber: "Barber",
  owner: "Owner",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  customer: "Book appointments and discover barbershops",
  barber: "Manage your schedule and clients",
  owner: "Manage your shop, staff and bookings",
  admin: "Oversee shops and users on the platform",
};

export const ROLE_ROUTES = {
  customer: "/customer/home",
  barber: "/barber/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin/dashboard",
} as const;

export const ROLE_TABS: Record<Role, { name: string; title: string; icon: string }[]> = {
  customer: [
    { name: "home", title: "Home", icon: "home" },
    { name: "discover", title: "Discover", icon: "compass" },
    { name: "bookings", title: "Bookings", icon: "calendar" },
    { name: "favorites", title: "Favorites", icon: "heart" },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  barber: [
    { name: "dashboard", title: "Dashboard", icon: "grid" },
    { name: "schedule", title: "Schedule", icon: "calendar" },
    { name: "clients", title: "Clients", icon: "people" },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  owner: [
    { name: "dashboard", title: "Dashboard", icon: "grid" },
    { name: "bookings", title: "Bookings", icon: "calendar" },
    { name: "staff", title: "Staff", icon: "people" },
    { name: "shop", title: "Shop", icon: "storefront" },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  admin: [
    { name: "dashboard", title: "Dashboard", icon: "grid" },
    { name: "shops", title: "Shops", icon: "storefront" },
    { name: "users", title: "Users", icon: "people" },
    { name: "settings", title: "Settings", icon: "settings" },
  ],
};
