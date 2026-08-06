export type Role = "customer" | "barber" | "owner" | "admin";

export const ROLES: Role[] = ["customer", "barber", "owner", "admin"];

/** Roles a user may pick for themselves. `admin` is granted only via Supabase. */
export const SELF_SELECTABLE_ROLES: Role[] = ["customer", "barber", "owner"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  barber: "Barber",
  owner: "Owner",
  admin: "Admin",
};

export const ACCOUNT_TYPE_LABELS: Record<Role, string> = {
  customer: "Customer",
  barber: "Barber",
  owner: "Shop Owner",
  admin: "Administrator",
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

export type RoleTab = {
  name: string;
  title: string;
  /** Ionicons name rendered as fallback for regular tabs. */
  icon: string;
  /** Custom image asset for the inactive state of a tab. */
  iconImage?: number;
  /** Custom image asset for the active state of a tab. */
  iconImageActive?: number;
};

export const ROLE_TABS: Record<Role, RoleTab[]> = {
  customer: [
    {
      name: "home",
      title: "Home",
      icon: "home",
      iconImage: require("../assets/images/home.png"),
      iconImageActive: require("../assets/images/home_2.png"),
    },
    {
      name: "discover",
      title: "Discover",
      icon: "compass",
      iconImage: require("../assets/images/discover.png"),
      iconImageActive: require("../assets/images/discover_2.png"),
    },
    {
      name: "bookings",
      title: "Bookings",
      icon: "calendar",
      iconImage: require("../assets/images/bookings.png"),
      iconImageActive: require("../assets/images/bookings_2.png"),
    },
    {
      name: "favorites",
      title: "Favorites",
      icon: "heart",
      iconImage: require("../assets/images/saved.png"),
      iconImageActive: require("../assets/images/saved_2.png"),
    },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  barber: [
    {
      name: "dashboard",
      title: "Dashboard",
      icon: "grid",
      iconImage: require("../assets/images/dashboard.png"),
      iconImageActive: require("../assets/images/dashboard_2.png"),
    },
    {
      name: "schedule",
      title: "Schedule",
      icon: "calendar",
      iconImage: require("../assets/images/schedule.png"),
      iconImageActive: require("../assets/images/schedule_2.png"),
    },
    {
      name: "clients",
      title: "Clients",
      icon: "people",
      iconImage: require("../assets/images/users.png"),
      iconImageActive: require("../assets/images/users_2.png"),
    },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  owner: [
    {
      name: "dashboard",
      title: "Dashboard",
      icon: "grid",
      iconImage: require("../assets/images/dashboard.png"),
      iconImageActive: require("../assets/images/dashboard_2.png"),
    },
    {
      name: "bookings",
      title: "Bookings",
      icon: "calendar",
      iconImage: require("../assets/images/bookings.png"),
      iconImageActive: require("../assets/images/bookings_2.png"),
    },
    {
      name: "staff",
      title: "Staff",
      icon: "people",
      iconImage: require("../assets/images/users.png"),
      iconImageActive: require("../assets/images/users_2.png"),
    },
    {
      name: "shop",
      title: "Shop",
      icon: "storefront",
      iconImage: require("../assets/images/shops.png"),
      iconImageActive: require("../assets/images/shops_2.png"),
    },
    { name: "profile", title: "Profile", icon: "person" },
  ],
  admin: [
    {
      name: "dashboard",
      title: "Dashboard",
      icon: "grid",
      iconImage: require("../assets/images/dashboard.png"),
      iconImageActive: require("../assets/images/dashboard_2.png"),
    },
    {
      name: "shops",
      title: "Shops",
      icon: "storefront",
      iconImage: require("../assets/images/shops.png"),
      iconImageActive: require("../assets/images/shops_2.png"),
    },
    {
      name: "users",
      title: "Users",
      icon: "people",
      iconImage: require("../assets/images/users.png"),
      iconImageActive: require("../assets/images/users_2.png"),
    },
    {
      name: "settings",
      title: "Settings",
      icon: "settings",
      iconImage: require("../assets/images/settings.png"),
      iconImageActive: require("../assets/images/settings_2.png"),
    },
  ],
};
