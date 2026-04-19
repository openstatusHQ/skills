import type { Theme } from "./types";

// Rename this export and the `id` to match your theme.
// Filename should be kebab-case matching the id, e.g. solarized.ts + id: "solarized".
export const MY_THEME = {
  id: "my-theme",
  name: "My Theme",
  author: {
    name: "@yourhandle",
    url: "https://your-site.dev",
  },
  light: {
    // Base
    "--background": "oklch(100% 0 0)",
    "--foreground": "oklch(20% 0 0)",
    "--border": "oklch(92% 0 0)",
    "--input": "var(--border)",
    "--muted": "oklch(97% 0 0)",
    "--muted-foreground": "oklch(55% 0 0)",
    "--accent": "var(--muted)",
    "--accent-foreground": "var(--foreground)",
    "--card": "var(--background)",
    "--card-foreground": "var(--foreground)",
    "--popover": "var(--background)",
    "--popover-foreground": "var(--foreground)",

    // Brand
    "--primary": "oklch(20% 0 0)",
    "--primary-foreground": "oklch(98% 0 0)",
    "--secondary": "var(--muted)",
    "--secondary-foreground": "var(--foreground)",

    // Status
    "--success": "oklch(72% 0.19 150)",
    "--warning": "oklch(77% 0.16 70)",
    "--destructive": "oklch(58% 0.24 27)",
    "--info": "oklch(62% 0.19 260)",

    // Charts (response-time percentiles)
    "--chart-1": "oklch(72% 0.19 150)",
    "--chart-2": "oklch(70% 0.17 180)",
    "--chart-3": "oklch(68% 0.17 220)",
    "--chart-4": "oklch(70% 0.18 280)",
    "--chart-5": "oklch(70% 0.19 330)",
  },
  dark: {
    // Base
    "--background": "oklch(14% 0 0)",
    "--foreground": "oklch(98% 0 0)",
    "--border": "oklch(100% 0 0 / 10%)",
    "--input": "oklch(100% 0 0 / 15%)",
    "--muted": "oklch(27% 0 0)",
    "--muted-foreground": "oklch(71% 0 0)",
    "--accent": "var(--muted)",
    "--accent-foreground": "var(--foreground)",
    "--card": "var(--background)",
    "--card-foreground": "var(--foreground)",
    "--popover": "var(--background)",
    "--popover-foreground": "var(--foreground)",

    // Brand
    "--primary": "oklch(92% 0 0)",
    "--primary-foreground": "oklch(20% 0 0)",
    "--secondary": "var(--muted)",
    "--secondary-foreground": "var(--foreground)",

    // Status
    "--success": "oklch(72% 0.19 150)",
    "--warning": "oklch(77% 0.16 70)",
    "--destructive": "oklch(70% 0.19 22)",
    "--info": "oklch(62% 0.19 260)",

    // Charts
    "--chart-1": "oklch(72% 0.19 150)",
    "--chart-2": "oklch(70% 0.17 180)",
    "--chart-3": "oklch(68% 0.17 220)",
    "--chart-4": "oklch(70% 0.18 280)",
    "--chart-5": "oklch(70% 0.19 330)",
  },
} as const satisfies Theme;
