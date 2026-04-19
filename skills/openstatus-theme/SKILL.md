---
name: openstatus-theme
version: 0.1.0
description: Design, scaffold, and contribute a community theme to openstatus (the open-source status page). Use whenever the user wants to create a new theme, customize status-page colors, build a palette for their brand, fork and contribute to openstatus's `@openstatus/theme-store`, or mentions OKLCH colors, CSS variables, or themes.openstatus.dev. Also use when the user pastes a theme export from the live explorer and wants it wired into the repo.
---

# OpenStatus Theme

Help the user design a new theme for openstatus status pages and, if they want, contribute it back to the `@openstatus/theme-store` package via pull request.

A theme is a bundle of CSS custom properties (light + dark mode) that openstatus applies to the status page. Themes live as `.ts` files in `packages/theme-store/src/`, each exporting a `Theme` object, registered in `packages/theme-store/src/index.ts`.

## When to Use

Trigger on any of these — even if the user doesn't say "theme" explicitly:

- "I want to create a theme for my status page"
- "Add/contribute a new theme to openstatus"
- "Customize the colors of my status page"
- "Make a Solarized / Nord / Catppuccin / <brand> theme"
- "I have a palette exported from themes.openstatus.dev — wire it up"
- "Help me match my brand colors on the status page"
- Any mention of editing files in `packages/theme-store/`

Do **not** use this skill for:
- Theming other parts of the dashboard (this is status-page specific)
- Runtime theme selection UI work — edit `apps/status-page/src/components/themes/` with a different flow

## Workflow

Work through these stages in order. Don't collapse them — each unlocks the next.

### 1. Clarify Intent

Ask two quick questions if not obvious from context:

1. **Where will this theme live?** Three options:
   - **Personal** — they're customizing their own status page, no PR intended. Skip the registry step and show them how to apply colors locally.
   - **Contribution** — they want to open a PR against openstatus. Full workflow applies.
   - **Both** — start as personal, graduate to contribution when happy.
2. **Do they already have a palette?** Three sources:
   - **Exported config** from [themes.openstatus.dev](https://themes.openstatus.dev/?b=true) (builder mode). If so, ask them to paste it.
   - **Existing design system / brand guide** — hex codes, Figma, a reference site. Extract what they have.
   - **From scratch** — help them design. Start by asking for mood, inspiration, or a reference theme.

Mention the live explorer once — "You can also use [themes.openstatus.dev](https://themes.openstatus.dev/?b=true) in builder mode to pick colors visually and export; I can wire the export into the repo for you." — don't push it if they'd rather stay in the terminal.

### 2. Locate the Theme Store

Before writing anything, confirm the repo layout. Look for:

- `packages/theme-store/src/` — where theme files live
- `packages/theme-store/src/types.ts` — canonical list of CSS variable names (`THEME_VAR_NAMES`)
- `packages/theme-store/src/index.ts` — registry (`THEMES_LIST`)
- `packages/theme-store/README.md` — contributor docs (treat as source of truth; if it diverges from this skill, follow the README)

If any of these are missing, stop and ask whether the user is in an openstatus fork. Don't fabricate paths.

### 3. Design the Palette

Only do this for "from scratch" or "from brand" paths. Skip if the user pasted a full export.

A theme has roughly five color groups. Design in this order:

1. **Base** — `--background`, `--foreground`, `--border`, `--card`, `--popover`, `--muted`, `--muted-foreground`, `--accent`. This sets the canvas.
2. **Brand** — `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`. Often the user's brand color and its on-color pair.
3. **Status** — `--success` (operational), `--warning` (degraded), `--destructive` (outage), `--info` (monitoring). These are the most user-facing colors and must be distinguishable at a glance even for colorblind users. See `references/theme-spec.md` for required hue ranges.
4. **Charts** — `--chart-1` through `--chart-5`, used to differentiate response-time percentiles. Pick five hues that read well as a gradient or categorical set.
5. **Rainbow (optional)** — `--rainbow-1` through `--rainbow-17`, used for the regional map. If omitted, the default openstatus rainbow is used. Only include if the user has a reason to override.

For each group, propose concrete values and explain *why* (e.g., "warm off-white background to match a Solarized vibe, matched with a deep neutral foreground for 7:1 contrast"). Don't batch all 20+ values silently — work one group at a time and let the user steer.

**Color space preference:** OKLCH is preferred because it's perceptually uniform (easier to pick accessible pairs). Hex and named colors work too — match what the user is comfortable with. See `references/theme-spec.md` for OKLCH quickstart.

### 4. Validate Accessibility

Before committing to a palette, check these:

- **Background vs foreground contrast** ≥ 4.5:1 (WCAG AA for body text). Ideally ≥ 7:1 (AAA).
- **Status colors distinguishable** — success/warning/destructive/info must be tellable apart without relying only on hue. When in doubt, test on a colorblindness simulator (e.g., `coblis`, Figma plugins).
- **Both modes work** — every color pair must look right in light *and* dark. A common failure is picking a dark-mode destructive that's too vivid and burns against a warm background.
- **No "Christmas tree"** — if more than three hues compete for attention at rest, pare back. The status page should feel calm.

If contrast fails, suggest specific adjustments (lighten foreground L in OKLCH, desaturate a status color, etc.) rather than hand-waving.

### 5. Scaffold the Theme File

Create a new TypeScript file in `packages/theme-store/src/<kebab-name>.ts`. Use the template in `assets/theme-template.ts` — copy it, rename the export, fill in values.

Rules:

- **Filename and id match.** `packages/theme-store/src/solarized.ts` → `id: "solarized"`. Use kebab-case, lowercase, no spaces.
- **`as const satisfies Theme`** — required so TypeScript narrows the type and enforces the shape.
- **Only include variables you override.** The store falls back to defaults; you don't need to restate all 54 vars.
- **Use `var(--x)` references** to DRY up the object if a color is reused (see `dracula.ts` for an example of this pattern).
- **`author.url`** can be a personal site, GitHub profile, or social link — not a placeholder.

If you're not sure how to name variables or what each does, read `references/theme-spec.md`.

### 6. Register in `index.ts`

Add an import and append the new theme to `THEMES_LIST` in `packages/theme-store/src/index.ts`. The README says "keep themes ordered" — place it alphabetically unless there's a clear reason to group differently.

```typescript
import { MY_THEME } from "./my-theme";
// ...
const THEMES_LIST = [
  // ...
  MY_THEME,
] satisfies Theme[];
```

`assertUniqueThemeIds` runs at module load — if the id collides with an existing theme, you'll get a clear error.

### 7. Test Locally

From the repo root:

```bash
pnpm dev:status-page
```

Two ways to preview:

- **Explorer** — `http://localhost:3000` shows the grid of all themes. The new one should appear.
- **Real status page** — `http://localhost:3000/status` renders a seeded status page. In the browser devtools, run `sessionStorage.setItem("community-theme", "true")` once to unlock the theme picker on non-default pages, then reload.

Check every component at least once: monitor list, region map, response-time charts, incident/maintenance cards, operational/degraded/outage badges. Toggle light and dark.

### 8. Run Repo Checks

Before opening a PR:

```bash
pnpm lint       # biome
pnpm typecheck  # or run tsc in packages/theme-store
```

If the skill is being used by an external contributor who may not have run these before, briefly explain what each does rather than just telling them to run it.

### 9. Submit the Pull Request

For contributions:

1. Ensure the branch is descriptive: `theme/<name>` is conventional.
2. Commit the new file plus the `index.ts` change together.
3. PR title: `feat(theme-store): add <Name> theme`.
4. PR description should include:
   - Author attribution (so the credit on the explorer is obvious)
   - Screenshots of light + dark mode on `/status`
   - Any accessibility notes (contrast ratios, colorblind testing)
   - Inspiration / reference links (if it's based on an existing scheme like Dracula, link the spec)

If the user is inside a Claude session and hasn't set up `gh` or remote access, just hand them the PR description draft — don't try to push for them.

## Theme Object Shape

Reproduced here for quick reference; authoritative source is `packages/theme-store/src/types.ts`.

```typescript
interface Theme {
  id: string;                        // kebab-case, unique
  name: string;                      // display name
  author: { name: string; url: string };
  light: Partial<Record<ThemeVarName, string>>;
  dark: Partial<Record<ThemeVarName, string>>;
}
```

54 possible CSS variable names across base/brand/status/chart/rainbow groups. All are optional — fall back to the default openstatus theme. See `references/theme-spec.md` for the full annotated list.

## Guidelines

- **Show don't tell.** When proposing colors, render a tiny markdown preview or a code block the user can see. If you have a terminal rendering tool, even better — but don't fake it.
- **Small iterations beat big dumps.** Propose 4-6 values, get feedback, continue. A full 50-variable dump up front is a waste if the user dislikes the direction after variable 3.
- **Match the house style.** Look at an existing theme (`openstatus.ts`, `supabase.ts`, `dracula.ts`) before writing. If the repo uses OKLCH, use OKLCH. If the neighbor theme uses hex, hex is fine too.
- **Respect `var(--x)` chains.** Don't expand variables the user wrote as references — preserve them for readability.
- **Never silently skip the registry step.** A theme that isn't in `THEMES_LIST` won't appear anywhere. If you write the file but forget to register, the user gets a confusing "my theme doesn't show up" bug.
- **Treat the live explorer as complementary, not canonical.** The repo is the source of truth. Exports from themes.openstatus.dev are a convenience input, not a replacement for the PR.