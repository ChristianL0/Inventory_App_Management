import type { LocationStatus } from "@/types";

export const LOCATION_STATUS_META: Record<LocationStatus, { label: string; badgeClass: string }> = {
  in_deposit: {
    label: "In Deposit",
    badgeClass: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  },
  at_architect: {
    label: "At the Architect",
    badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
};