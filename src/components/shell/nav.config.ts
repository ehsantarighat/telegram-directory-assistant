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
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

/**
 * Bottom-nav items (mobile) + top-nav items (desktop). Five short labels
 * that fit on a 375px viewport (5 × 75px). Suggest sits in the middle so
 * community contributions are reachable on mobile too — previously it
 * was only in the desktop secondary nav, hidden on phones.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Discover", icon: HomeIcon },
  { href: "/listings", label: "Listings", icon: CompassIcon },
  { href: "/suggest-channel", label: "Suggest", icon: Lightbulb },
  { href: "/saved", label: "Saved", icon: BookmarkIcon, requiresAuth: true },
  { href: "/profile", label: "Profile", icon: UserIcon, requiresAuth: true },
];

/**
 * Empty now that Suggest is in PRIMARY_NAV. Kept exported so DesktopNav
 * keeps compiling without a refactor — the iteration over it becomes a
 * no-op rather than a removed import surface.
 */
export const SECONDARY_NAV: NavItem[] = [];

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
  { href: "/admin/team", label: "Team", icon: ShieldCheckIcon },
];

export const ADMIN_SECONDARY_NAV: NavItem[] = [
  { href: "/profile", label: "Settings", icon: Settings2 },
];
