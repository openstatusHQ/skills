# Component API Reference

Complete API reference for all OpenStatus status page UI components.

## Installation Bundles

| Bundle | Components Included | Use Case |
|--------|-------------------|----------|
| `status-complete` | All components below | Full status page |
| `status-essentials` | types, utils, icon, layout, banner, blank | Minimal status display |

## Types (`status.types.ts`)

```typescript
type StatusType = "success" | "degraded" | "error" | "info" | "empty";
type StatusEventType = "incident" | "report" | "maintenance";
type StatusReportUpdateType = "investigating" | "identified" | "monitoring" | "resolved";

interface StatusReportUpdate {
  date: Date;
  message: string;
  status: StatusReportUpdateType;
}

interface StatusReport {
  id: number;
  title: string;
  affected: string[];
  updates: StatusReportUpdate[];
}

interface Maintenance {
  id: number;
  title: string;
  affected: string[];
  message: string;
  from: Date;
  to: Date;
}

type StatusBarData = {
  day: string;
  bar: { status: StatusType; height: number }[];   // heights sum to 100%
  card: { status: StatusType; value: string }[];
  events: {
    id: number;
    name: string;
    type: StatusEventType;
    from: Date | null;
    to: Date | null;
  }[];
};
```

## Utilities (`status.utils.ts`)

| Export | Type | Description |
|--------|------|-------------|
| `systemStatusLabels` | `Record<StatusType, { long: string; short: string }>` | Display labels (e.g., "All Systems Operational" / "Operational") |
| `requestStatusLabels` | `Record<StatusType, string>` | Per-request labels (e.g., "Normal", "Degraded") |
| `incidentStatusLabels` | `Record<StatusReportUpdateType, string>` | Incident phase labels (e.g., "Investigating", "Resolved") |
| `statusColors` | `Record<StatusType, string>` | CSS variable mappings (e.g., `"var(--success)"`) |
| `formatDateRange(from?, to?)` | `string` | Human-readable date range |
| `formatDate(date, options?, locale?)` | `string` | Locale-aware date formatting |
| `formatDateTime(date, locale?)` | `string` | Date + time formatting |
| `formatTime(date, locale?)` | `string` | Time-only formatting |

## Layout Components (`status-layout.tsx`)

### `<Status>`

Root container. Sets the status context for all child components via `data-variant`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"success" \| "degraded" \| "error" \| "info"` | `"success"` | Overall page status |

### `<StatusHeader>`

Container with `@container/status-header` for responsive header layouts.

### `<StatusBrand>`

Brand logo image. Renders as `<img>` with default `size-8`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | Yes | Image URL |
| `alt` | `string` | Yes | Alt text |

### `<StatusTitle>`

Primary heading. Semibold, large text, tight leading.

### `<StatusDescription>`

Muted secondary text for subtitles.

### `<StatusContent>`

Vertical flex container (`gap-3`) for stacking status components.

### `<StatusIcon>`

Auto-renders the correct icon based on parent `<Status>` variant.

## Banner Components (`status-banner.tsx`)

### `<StatusBanner>`

Pre-composed banner with icon, message, and timestamp.

| Prop | Type | Description |
|------|------|-------------|
| `status` | `"success" \| "degraded" \| "error" \| "info"` | Banner status |

### `<StatusBannerContainer>`

Base container for custom banner composition. Renders colored border and background.

| Prop | Type | Description |
|------|------|-------------|
| `status` | `"success" \| "degraded" \| "error" \| "info"` | Banner status |

### `<StatusBannerIcon>`

Auto-renders icon based on parent container's status.

### `<StatusBannerMessage>`

Auto-renders long-form status label (e.g., "All Systems Operational") based on parent status.

### `<StatusBannerTitle>`

Solid-color title bar. Background color matches status.

### `<StatusBannerContent>`

Padded content area for banner body text.

### Tab Components

For multi-incident banners:

| Component | Description |
|-----------|-------------|
| `<StatusBannerTabs status defaultValue>` | Tab container with status-colored background |
| `<StatusBannerTabsList>` | Scrollable tab navigation |
| `<StatusBannerTabsTrigger value status>` | Individual tab button |
| `<StatusBannerTabsContent value>` | Tab panel content |

## Monitor Components (`status-component.tsx`)

### `<StatusComponent>`

Root container for a single monitor/service display.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `"success" \| "degraded" \| "error" \| "info"` | Yes | Monitor status |

### Header Components

| Component | Description |
|-----------|-------------|
| `<StatusComponentHeader>` | Flex container with `justify-between` |
| `<StatusComponentHeaderLeft>` | Left section (icon, title, description) |
| `<StatusComponentHeaderRight>` | Right section (uptime, status label) |

### Display Components

| Component | Props | Description |
|-----------|-------|-------------|
| `<StatusComponentIcon>` | - | Auto-renders icon from parent variant |
| `<StatusComponentTitle>` | `children: string` | Monitor name (monospace, truncated) |
| `<StatusComponentDescription>` | `children: string` | Info icon with tooltip on hover/tap |
| `<StatusComponentUptime>` | `children: string` | Uptime percentage display |
| `<StatusComponentUptimeSkeleton>` | - | Loading skeleton for uptime |
| `<StatusComponentStatus>` | - | Auto-renders status label from parent variant |

### Body Components

| Component | Props | Description |
|-----------|-------|-------------|
| `<StatusComponentBody>` | - | Content area with `space-y-2` |
| `<StatusComponentFooter>` | `data: StatusBarData[], isLoading?: boolean` | Date range footer ("45 days ago" — "today") |

## Status Bar (`status-bar.tsx`)

### `<StatusBar>`

Interactive uptime timeline with hover cards, keyboard navigation, and touch support.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `StatusBarData[]` | Array of daily status data |

Features: hover details, arrow key navigation, enter to select, escape to close.

## Monitor Groups (`status-component-group.tsx`)

### `<StatusComponentGroup>`

Collapsible wrapper for organizing monitors.

| Component | Description |
|-----------|-------------|
| `<StatusComponentGroup>` | Root collapsible container |
| `<StatusComponentGroupTrigger>` | Click to expand/collapse |
| `<StatusComponentGroupContent>` | Container for grouped `<StatusComponent>` elements |

## Feed Components (`status-feed.tsx`)

### `<StatusFeed>`

Unified chronological feed of incidents and maintenance.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `statusReports` | `StatusReport[]` | `[]` | Incident reports |
| `maintenances` | `Maintenance[]` | `[]` | Maintenance events |

Renders empty state automatically when both arrays are empty.

## Event Components (`status-events.tsx`)

Lower-level primitives used by `<StatusFeed>`:

| Component | Description |
|-----------|-------------|
| `<StatusEventGroup>` | Container for event list |
| `<StatusEvent>` | Single event wrapper |
| `<StatusEventAside>` | Date sidebar |
| `<StatusEventDate>` | Formatted event date |
| `<StatusEventContent>` | Event body |
| `<StatusEventTitle>` | Event title |
| `<StatusEventAffected>` | Container for affected service badges |
| `<StatusEventAffectedBadge>` | Individual affected service badge |
| `<StatusEventTimelineReport updates>` | Incident update timeline |
| `<StatusEventTimelineMaintenance maintenance>` | Maintenance details with date range |

## Blank State Components (`status-blank.tsx`)

| Component | Description |
|-----------|-------------|
| `<StatusBlankContainer>` | Empty state wrapper |
| `<StatusBlankContent>` | Content area |
| `<StatusBlankTitle>` | Empty state heading |
| `<StatusBlankDescription>` | Empty state description |
| `<StatusBlankReport>` | Visual card preview (stackable for depth effect) |

## Timestamp (`status-timestamp.tsx`)

### `<StatusTimestamp>`

Interactive timestamp with tooltip/hover-card showing multiple timezone formats.

| Prop | Type | Description |
|------|------|-------------|
| `date` | `Date` | The timestamp to display |
