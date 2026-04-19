# Contribution Checklist

Use this checklist before opening a PR to `openstatusHQ/openstatus` with a new theme.

## Files changed

- [ ] New theme file at `packages/theme-store/src/<id>.ts`
- [ ] Import + append in `packages/theme-store/src/index.ts` (`THEMES_LIST`)
- [ ] No other files changed (themes are purely data — no component changes needed)

## Theme object

- [ ] `id` is unique kebab-case
- [ ] `id` matches the filename
- [ ] `name` is a sensible display string
- [ ] `author.name` and `author.url` are real (no placeholders)
- [ ] Uses `as const satisfies Theme`
- [ ] Both `light` and `dark` populated
- [ ] Only overrides variables that matter — relies on fallbacks for the rest

## Visual checks

- [ ] Explorer grid (`http://localhost:3000`) renders the theme card correctly
- [ ] Status page (`http://localhost:3000/status`) with `sessionStorage.setItem("community-theme", "true")` shows the theme live
- [ ] Light mode checked: monitor list, incident card, maintenance card, charts, regional map, operational/degraded/outage badges
- [ ] Dark mode checked: same list, all colors adjusted appropriately
- [ ] No unreadable text (foreground vs any surface)
- [ ] Status colors visibly distinct from each other

## Accessibility

- [ ] Foreground vs background contrast ≥ 4.5:1 in both modes
- [ ] Status colors distinguishable under a deuteranopia simulator
- [ ] Focus rings visible

## Repo checks

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` (or the equivalent) passes
- [ ] No new runtime warnings in the console when loading the explorer

## PR

- [ ] Branch name: `theme/<id>`
- [ ] Title: `feat(theme-store): add <Name> theme`
- [ ] Description includes:
  - [ ] Author attribution line
  - [ ] Light + dark screenshots of `/status`
  - [ ] Accessibility notes (contrast ratios, colorblind test if done)
  - [ ] Inspiration reference links (if based on an existing scheme like Dracula, Solarized, Nord, etc.)
- [ ] Linked to any relevant issue or discussion

## Getting help

If you're unsure about any of this, the openstatus team is on [Discord](https://openstatus.dev/discord). A half-working PR with questions is better than a polished PR that assumes wrong.
