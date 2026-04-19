---
name: status-page-ui
version: 0.2.0
description: Build a custom status page UI using OpenStatus components or SDK. Use when someone wants to "create a status page," "build a status page," "integrate OpenStatus UI," "embed a status widget," "add status page components," or render monitors, incidents, and maintenance in their own app.
---

# Status Page UI

Build a status page UI using OpenStatus — from a quick React widget to a fully custom page with composable components. Choose the approach that fits your needs.

## When to Use

- "build a status page with OpenStatus"
- "add a status page to my app"
- "embed a status widget"
- "integrate OpenStatus UI into my router"
- "show monitor status in my dashboard"
- "fetch status page data with the SDK"
- User wants to render monitors, uptime bars, incident timelines, or maintenance feeds

## Choose Your Approach

| Approach | Best For | Effort |
|----------|----------|--------|
| **React Widget** | Quick embed in any React app | 5 min |
| **Component Registry** | Custom status page with full control | 30 min |
| **Node.js SDK** | Programmatic data fetching & management | 20 min |

---

## Approach 1: React Widget (Quickest)

For a simple status indicator, use the `@openstatus/react` package:

```bash
npm install @openstatus/react
```

**React Server Component:**

```tsx
import { StatusWidget } from "@openstatus/react";

export function Page() {
  return <StatusWidget slug="your-slug" />;
}
```

With custom link: `<StatusWidget slug="your-slug" href="https://status.yourdomain.com" />`

> `StatusWidget` is an async RSC — it only works with React Server Components.

**Custom widget with `getStatus`:**

```tsx
import { getStatus } from "@openstatus/react";

async function CustomStatus() {
  const { status } = await getStatus("your-slug");
  // status: "unknown" | "operational" | "degraded_performance"
  //       | "partial_outage" | "major_outage" | "under_maintenance" | "incident"
  return <div>Current status: {status}</div>;
}
```

**Styling:**
- With Tailwind: add `"./node_modules/@openstatus/react/**/*.{js,ts,jsx,tsx}"` to your content config
- Without Tailwind: `import "@openstatus/react/dist/styles.css"`

---

## Approach 2: Component Registry (Full Custom UI)

For complete control, install composable components from the OpenStatus shadcn-compatible registry.

### Step 1: Install Components

```bash
# Everything (recommended for a full status page)
npx shadcn@latest add https://openstatus.dev/r/status-complete.json

# Or only essentials (banner, layout, icons, blank states)
npx shadcn@latest add https://openstatus.dev/r/status-essentials.json

# Or individual components
npx shadcn@latest add https://openstatus.dev/r/status-banner.json
npx shadcn@latest add https://openstatus.dev/r/status-component.json
npx shadcn@latest add https://openstatus.dev/r/status-bar.json
npx shadcn@latest add https://openstatus.dev/r/status-feed.json
```

### Step 2: Add CSS Variables

Add status color variables to your global CSS (required):

```css
@layer base {
  :root {
    --success: 142.1 76.2% 36.3%;
    --success-foreground: 355.7 100% 97.3%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --info: 221.2 83.2% 53.3%;
    --info-foreground: 210 40% 98%;
  }

  .dark {
    --success: 142.1 70.6% 45.3%;
    --success-foreground: 144.9 80.4% 10%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --destructive: 0 72.2% 50.6%;
    --destructive-foreground: 0 85.7% 97.3%;
    --info: 217.2 91.2% 59.8%;
    --info-foreground: 222.2 47.4% 11.2%;
  }
}
```

Extend Tailwind config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        success: "hsl(var(--success))",
        "success-foreground": "hsl(var(--success-foreground))",
        warning: "hsl(var(--warning))",
        "warning-foreground": "hsl(var(--warning-foreground))",
        info: "hsl(var(--info))",
        "info-foreground": "hsl(var(--info-foreground))",
      },
    },
  },
};
```

### Step 3: Fetch Data

Use the OpenStatus SDK (see Approach 3) or your own data source. Components expect these types:

```typescript
type StatusType = "success" | "degraded" | "error" | "info" | "empty";

interface StatusBarData {
  day: string;
  bar: { status: StatusType; height: number }[]; // heights must sum to 100%
  card: { status: StatusType; value: string }[];
  events: {
    id: number;
    name: string;
    type: "incident" | "report" | "maintenance";
    from: Date | null;
    to: Date | null;
  }[];
}

interface StatusReport {
  id: number;
  title: string;
  affected: string[];
  updates: {
    date: Date;
    message: string;
    status: "investigating" | "identified" | "monitoring" | "resolved";
  }[];
}

interface Maintenance {
  id: number;
  title: string;
  affected: string[];
  message: string;
  from: Date;
  to: Date;
}
```

### Step 4: Compose the Page

```tsx
import {
  Status, StatusHeader, StatusBrand, StatusTitle,
  StatusDescription, StatusContent,
} from "@/components/blocks/status-layout";
import { StatusBanner } from "@/components/blocks/status-banner";
import {
  StatusComponent, StatusComponentHeader,
  StatusComponentHeaderLeft, StatusComponentHeaderRight,
  StatusComponentIcon, StatusComponentTitle,
  StatusComponentDescription, StatusComponentUptime,
  StatusComponentStatus, StatusComponentBody,
  StatusComponentFooter,
} from "@/components/blocks/status-component";
import { StatusBar } from "@/components/blocks/status-bar";
import { StatusFeed } from "@/components/blocks/status-feed";

export function MyStatusPage({ monitors, reports, maintenances, overallStatus }) {
  return (
    <Status variant={overallStatus}>
      <StatusHeader>
        <div className="flex items-center gap-4">
          <StatusBrand src="/logo.png" alt="My Company" />
          <div>
            <StatusTitle>System Status</StatusTitle>
            <StatusDescription>Current health of all services</StatusDescription>
          </div>
        </div>
      </StatusHeader>

      <StatusBanner status={overallStatus} />

      <StatusContent>
        {monitors.map((monitor) => (
          <StatusComponent key={monitor.id} variant={monitor.status}>
            <StatusComponentHeader>
              <StatusComponentHeaderLeft>
                <StatusComponentIcon />
                <StatusComponentTitle>{monitor.name}</StatusComponentTitle>
                <StatusComponentDescription>
                  {monitor.description}
                </StatusComponentDescription>
              </StatusComponentHeaderLeft>
              <StatusComponentHeaderRight>
                <StatusComponentUptime>{monitor.uptime}%</StatusComponentUptime>
                <StatusComponentStatus />
              </StatusComponentHeaderRight>
            </StatusComponentHeader>
            <StatusComponentBody>
              <StatusBar data={monitor.barData} />
              <StatusComponentFooter data={monitor.barData} />
            </StatusComponentBody>
          </StatusComponent>
        ))}
      </StatusContent>

      <StatusFeed statusReports={reports} maintenances={maintenances} />
    </Status>
  );
}
```

### Step 5: Optional Enhancements

See `references/component-api.md` for the full component API and `references/advanced-patterns.md` for collapsible groups, tabbed banners, and custom banner composition.

---

## Approach 3: Node.js SDK

Programmatically manage status pages and fetch data with `@openstatus/sdk-node`:

```bash
npm install @openstatus/sdk-node
```

### Create a Status Page with Components

```typescript
import {
  createOpenStatusClient,
  Periodicity,
  Region,
} from "@openstatus/sdk-node";

const client = createOpenStatusClient({
  apiKey: process.env.OPENSTATUS_API_KEY,
});

// Create a status page
const { statusPage } = await client.statusPage.v1.StatusPageService.createStatusPage({
  title: "Acme Status",
  slug: "acme-status",
  description: "Real-time status of Acme services",
  homepageUrl: "https://acme.com",
  contactUrl: "mailto:support@acme.com",
});

// Add a monitor component (linked to a live monitor)
await client.statusPage.v1.StatusPageService.addMonitorComponent({
  pageId: statusPage!.id,
  monitorId: existingMonitorId,
  name: "Production API",
  description: "Core API endpoint",
  order: 1,
});

// Add a static component (manual status only, no linked monitor)
await client.statusPage.v1.StatusPageService.addStaticComponent({
  pageId: statusPage!.id,
  name: "Third-Party Payment Gateway",
  description: "External dependency",
  order: 2,
});

// Create a component group
const { group } = await client.statusPage.v1.StatusPageService.createComponentGroup({
  pageId: statusPage!.id,
  name: "Infrastructure",
});

// Move a component into a group
await client.statusPage.v1.StatusPageService.updateComponent({
  id: componentId,
  groupId: group!.id,
  groupOrder: 1,
});
```

### Fetch Status Page Content

```typescript
// Get full page content (components, groups, active reports, maintenances)
const content = await client.statusPage.v1.StatusPageService.getStatusPageContent({
  identifier: { case: "slug", value: "acme-status" },
});

// Get overall status summary
const { overallStatus, componentStatuses } =
  await client.statusPage.v1.StatusPageService.getOverallStatus({
    identifier: { case: "slug", value: "acme-status" },
  });
```

### Subscriber Management

```typescript
// Subscribe a user
await client.statusPage.v1.StatusPageService.subscribeToPage({
  pageId: statusPage!.id,
  email: "user@example.com",
});

// List subscribers
const { subscribers } = await client.statusPage.v1.StatusPageService.listSubscribers({
  pageId: statusPage!.id,
  limit: 50,
});

// Unsubscribe
await client.statusPage.v1.StatusPageService.unsubscribeFromPage({
  pageId: statusPage!.id,
  identifier: { case: "email", value: "user@example.com" },
});
```

---

## Page Components: Monitor vs Static

OpenStatus supports two types of page components:

| Feature | Monitor Component | Static Component |
|---------|------------------|-----------------|
| Linked to a monitor | Yes | No |
| Automatic incidents | Yes | No |
| Manual status reports | Yes | Yes |
| Scheduled maintenance | Yes | Yes |
| Use case | Your own services | Third-party dependencies |

**Status hierarchy:**
- Monitor: Error > Degraded > Info > Success
- Static: Degraded > Info > Success

**Component Groups** organize related components into collapsible sections (e.g., "API Services", "Infrastructure", "External Dependencies").

---

## Theming

OpenStatus supports community themes for status pages. Available themes include `default`, `supabase`, `github-high-contrast`, `dracula`, and more.

- Browse themes at [themes.openstatus.dev](https://themes.openstatus.dev)
- Configure in Dashboard > Status Page settings > Theme Explorer
- Contribute themes by adding CSS variable overrides to the `@openstatus/theme-store` package

Themes customize: base colors, status colors, brand colors (primary, secondary, muted, accent), and border radius.

---

## Internationalization (i18n)

Status pages support localization (paid plans only):

- **Supported locales:** `en` (English), `fr` (French), `de` (German)
- **Enable:** Dashboard > Status Page settings > Locales
- **Routing:** locale prefix added as-needed (default locale omitted from URL)
  - Subdomain: `/status/fr/events`
  - Custom domain: `/fr/events`

---

## Configuration Options

| Option | Description |
|--------|-------------|
| **Slug** | URL path (e.g., `acme` → `acme.openstatus.dev`) |
| **Custom Domain** | Your own domain with CNAME to `status.openstatus.dev` |
| **Password Protection** | Basic auth; bypass with `?pw=secret` |
| **Magic Link Auth** | Email domain restriction (paid) |
| **Favicon** | Custom browser tab icon |
| **Homepage URL** | Where the logo links to |
| **Contact URL** | "Message" icon link (supports `mailto:`) |
| **White Label** | Remove "powered by OpenStatus" footer (paid) |
| **JSON Feed** | Machine-readable at `/feed/json` |
| **RSS/Atom Feed** | Available at `/feed/rss` and `/feed/atom` |
| **SSH Access** | `ssh [slug]@ssh.openstatus.dev` |
| **Tracker Bar Type** | `absolute` or `manual` |
| **Tracker Card Type** | `duration` or `requests` (when bar is `absolute`) |
| **Show Uptime** | Toggle uptime percentage display |

---

## Anti-Patterns

- **Don't skip CSS variables** when using the component registry. Components use `var(--success)`, `var(--warning)`, etc.
- **Don't mix import paths.** After registry install, import from `@/components/blocks/...`, not `@openstatus/ui/...`.
- **Don't hardcode status labels.** Use `StatusComponentStatus` and `StatusBannerMessage` — they auto-render from the variant prop.
- **Don't forget `"use client"` directives.** `StatusComponent`, `StatusBar`, and `StatusFeed` use client hooks.
## Guidelines

- **Start with the React Widget** if you just need a quick status indicator.
- **Use the Component Registry** for a fully branded, custom status page in your own router.
- **Use the SDK** to programmatically create pages, manage components, and fetch data.
- **The `variant` prop drives everything.** Pass `"success"`, `"degraded"`, `"error"`, or `"info"` — child components auto-style via CSS data attributes.
- **StatusBar is interactive.** Supports hover, keyboard navigation, and touch with no extra wiring.
- **StatusFeed merges reports and maintenance.** Pass both arrays and it handles chronological sorting.
- **All components are composable.** Every component accepts `className` and standard div props.

## Related Skills

- `status-page-context` — Set up the foundational context document (components, SLAs, tone)
- `incident-communication` — Write status updates during incidents
- `maintenance` — Write maintenance announcements
- `status-report` — Write periodic health reports
- `global-speed-checker` — Run global HTTP performance checks from 28 regions
