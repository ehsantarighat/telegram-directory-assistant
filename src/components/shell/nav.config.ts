import {
  BookmarkIcon,
  CompassIcon,
  HomeIcon,
  Lightbulb,
  type LucideIcon,
  Megaphone,
  Radio,
  ScrollText,
  Settings2,
  UserIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

/**
 * Bottom-nav items (mobile). Kept to four so they fit comfortably on a 375px
 * viewport without crowding. Top-nav (desktop) uses the same list plus the
 * "Suggest channel" CTA which lives in the user menu on mobile.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Discover", icon: HomeIcon },
  { href: "/listings", label: "Listings", icon: CompassIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon, requiresAuth: true },
  { href: "/profile", label: "Profile", icon: UserIcon, requiresAuth: true },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/suggest-channel", label: "Suggest a channel", icon: Lightbulb },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: ScrollText },
  { href: "/admin/channels", label: "Channels", icon: Radio },
  {
    href: "/admin/channel-suggestions",
    label: "Channel suggestions",
    icon: Lightbulb,
  },
  { href: "/admin/listings", label: "Listings", icon: CompassIcon },
  {
    href: "/admin/removal-requests",
    label: "Removal requests",
    icon: Megaphone,
  },
];

export const ADMIN_SECONDARY_NAV: NavItem[] = [
  { href: "/profile", label: "Settings", icon: Settings2 },
];
