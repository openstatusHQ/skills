# Theme Examples — Good vs Bad

## Palette design

### Bad: high-chroma everywhere

```typescript
light: {
  "--background": "oklch(95% 0.15 280)",  // lavender background
  "--foreground": "oklch(30% 0.25 10)",   // dark red-ish text
  "--primary": "oklch(60% 0.30 130)",     // neon green
  "--success": "oklch(70% 0.28 150)",
  "--warning": "oklch(80% 0.22 60)",
  "--destructive": "oklch(55% 0.28 25)",
}
```

**Why it's bad:** Every surface is fighting for attention. Status colors compete with `--background` chroma, so an "Operational" badge doesn't stand out. The "Christmas tree" effect.

### Good: neutral canvas, expressive accents

```typescript
light: {
  "--background": "oklch(100% 0 0)",
  "--foreground": "oklch(14.5% 0 0)",
  "--border": "oklch(92.2% 0 0)",
  "--muted": "oklch(97% 0 0)",
  "--muted-foreground": "oklch(55.6% 0 0)",
  "--primary": "oklch(20.5% 0 0)",
  "--success": "oklch(72% 0.19 150)",
  "--warning": "oklch(77% 0.16 70)",
  "--destructive": "oklch(57.7% 0.245 27.325)",
  "--info": "oklch(62% 0.19 260)",
}
```

**Why it's good:** Base and brand are near-grayscale. Status colors get all the chroma and pop clearly. Direct excerpt from `openstatus.ts`.

---

## Handling light vs dark

### Bad: identical status values in both modes

```typescript
light: { "--destructive": "oklch(45% 0.28 27)" },
dark:  { "--destructive": "oklch(45% 0.28 27)" },
```

**Why it's bad:** A dark-mode red at `L 45%` burns against `L 14%` background — vibrating, illegible. Needs to be lifted.

### Good: mode-specific tuning

```typescript
light: { "--destructive": "oklch(57.7% 0.245 27.325)" },
dark:  { "--destructive": "oklch(70.4% 0.191 22.216)" },
```

**Why it's good:** Dark-mode version is lighter and slightly desaturated, which is the correct perceptual adjustment. From `openstatus.ts`.

---

## DRY with `var(--x)`

### Bad: copy-pasted values drift over time

```typescript
light: {
  "--primary": "#1F1F1F",
  "--primary-foreground": "#FFFBEB",
  "--card-foreground": "#1F1F1F",
  "--popover-foreground": "#1F1F1F",
}
```

**Why it's bad:** If `--foreground` later changes, three other places silently diverge.

### Good: reference the canonical value

```typescript
light: {
  "--foreground": "#1F1F1F",
  "--background": "#FFFBEB",
  "--primary": "var(--foreground)",
  "--primary-foreground": "var(--background)",
  "--card-foreground": "var(--foreground)",
  "--popover-foreground": "var(--foreground)",
}
```

**Why it's good:** Single source of truth. Pattern lifted from `dracula.ts`.

---

## IDs and naming

### Bad

- `id: "My_Cool_Theme_v2"` — snake/pascal mix, version in id
- `id: "theme1"` — non-descriptive
- filename `MyCoolTheme.ts`, id `"my-cool-theme"` — mismatch

### Good

- filename `solarized.ts`, id `"solarized"`, name `"Solarized"`
- filename `github.ts`, id `"github-contrast"`, name `"GitHub (High Contrast)"` — name can be nicer than id
- filename `my-brand.ts`, id `"my-brand"`, name `"My Brand"`

The filename should be the id. The name is a human display string and can use spaces and capitalization.

---

## Author attribution

### Bad

```typescript
author: { name: "Anonymous", url: "" }
author: { name: "TODO", url: "https://example.com" }
```

### Good

```typescript
author: { name: "@thibaultleouay", url: "https://thibaultleouay.dev" }
author: { name: "@openstatus", url: "https://openstatus.dev" }
```

**Why:** Themes get credited on the live explorer. An empty or placeholder author means the person who did the work doesn't get credit.

---

## When to override rainbow

### Bad: overriding for no reason

A generic minimalist theme re-specifies all 17 `--rainbow-*` values with hues that happen to be slightly different.

**Why it's bad:** Adds 17 maintenance points with no user-visible benefit. Defaults are already distinguishable.

### Good: omitting rainbow

Leave `--rainbow-*` out of your theme entirely. The default ramp from `apps/status-page/src/app/globals.css` kicks in.

### Good: overriding with intent

A maximalist neon cyberpunk theme replaces all 17 values with on-brand neons. Commit message explains why.
