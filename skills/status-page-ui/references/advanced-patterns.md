# Advanced Component Patterns

## Collapsible Monitor Groups

Organize related monitors into expandable/collapsible sections:

```tsx
import {
  StatusComponentGroup,
  StatusComponentGroupContent,
  StatusComponentGroupTrigger,
} from "@/components/blocks/status-component-group";

<StatusComponentGroup>
  <StatusComponentGroupTrigger>Infrastructure</StatusComponentGroupTrigger>
  <StatusComponentGroupContent>
    <StatusComponent variant="success">
      <StatusComponentHeader>
        <StatusComponentHeaderLeft>
          <StatusComponentIcon />
          <StatusComponentTitle>Database</StatusComponentTitle>
        </StatusComponentHeaderLeft>
        <StatusComponentHeaderRight>
          <StatusComponentUptime>99.99%</StatusComponentUptime>
          <StatusComponentStatus />
        </StatusComponentHeaderRight>
      </StatusComponentHeader>
      <StatusComponentBody>
        <StatusBar data={dbBarData} />
        <StatusComponentFooter data={dbBarData} />
      </StatusComponentBody>
    </StatusComponent>
    <StatusComponent variant="success">
      <StatusComponentHeader>
        <StatusComponentHeaderLeft>
          <StatusComponentIcon />
          <StatusComponentTitle>Redis Cache</StatusComponentTitle>
        </StatusComponentHeaderLeft>
        <StatusComponentHeaderRight>
          <StatusComponentUptime>100%</StatusComponentUptime>
          <StatusComponentStatus />
        </StatusComponentHeaderRight>
      </StatusComponentHeader>
    </StatusComponent>
  </StatusComponentGroupContent>
</StatusComponentGroup>
```

## Tabbed Incident Banners

When multiple incidents are active, use tabs to show each one:

```tsx
import {
  StatusBannerContainer,
  StatusBannerTabs,
  StatusBannerTabsList,
  StatusBannerTabsTrigger,
  StatusBannerTabsContent,
  StatusBannerContent,
} from "@/components/blocks/status-banner";

<StatusBannerContainer status="error">
  <StatusBannerTabs status="error" defaultValue="incident-1">
    <StatusBannerTabsList>
      <StatusBannerTabsTrigger value="incident-1" status="error">
        API Outage
      </StatusBannerTabsTrigger>
      <StatusBannerTabsTrigger value="incident-2" status="error">
        CDN Slowdown
      </StatusBannerTabsTrigger>
    </StatusBannerTabsList>
    <StatusBannerTabsContent value="incident-1">
      <StatusBannerContent>
        <p>We are investigating elevated error rates on the API.</p>
      </StatusBannerContent>
    </StatusBannerTabsContent>
    <StatusBannerTabsContent value="incident-2">
      <StatusBannerContent>
        <p>CDN response times are higher than normal.</p>
      </StatusBannerContent>
    </StatusBannerTabsContent>
  </StatusBannerTabs>
</StatusBannerContainer>
```

## Custom Banner Composition

For full control over banner layout, use the primitives directly:

```tsx
import {
  StatusBannerContainer,
  StatusBannerIcon,
  StatusBannerMessage,
  StatusBannerTitle,
  StatusBannerContent,
} from "@/components/blocks/status-banner";

<StatusBannerContainer status="degraded">
  <StatusBannerTitle>Ongoing Incident</StatusBannerTitle>
  <StatusBannerContent>
    <div className="flex items-center gap-3">
      <StatusBannerIcon />
      <StatusBannerMessage />
    </div>
    <p className="text-sm text-muted-foreground">
      Last updated 5 minutes ago
    </p>
  </StatusBannerContent>
</StatusBannerContainer>
```

## Loading States

Use skeleton components while data is loading:

```tsx
import {
  StatusComponentUptimeSkeleton,
  StatusComponentFooter,
} from "@/components/blocks/status-component";

<StatusComponentHeaderRight>
  {isLoading ? (
    <StatusComponentUptimeSkeleton />
  ) : (
    <StatusComponentUptime>{uptime}%</StatusComponentUptime>
  )}
</StatusComponentHeaderRight>

<StatusComponentBody>
  <StatusBar data={barData} />
  <StatusComponentFooter data={barData} isLoading={isLoading} />
</StatusComponentBody>
```

## Empty States

StatusFeed automatically renders an empty state when no events exist. For custom empty states:

```tsx
import {
  StatusBlankContainer,
  StatusBlankContent,
  StatusBlankTitle,
  StatusBlankDescription,
  StatusBlankReport,
} from "@/components/blocks/status-blank";

<StatusBlankContainer>
  <div className="relative mt-8 flex w-full flex-col items-center justify-center">
    <StatusBlankReport className="-top-16 absolute scale-60 opacity-50" />
    <StatusBlankReport className="-top-8 absolute scale-80 opacity-80" />
    <StatusBlankReport />
  </div>
  <StatusBlankContent>
    <StatusBlankTitle>No incidents</StatusBlankTitle>
    <StatusBlankDescription>
      All systems have been running smoothly.
    </StatusBlankDescription>
  </StatusBlankContent>
</StatusBlankContainer>
```

## Manual Event Rendering

For fine-grained control over the event feed, use the lower-level event primitives instead of `StatusFeed`:

```tsx
import {
  StatusEventGroup,
  StatusEvent,
  StatusEventAside,
  StatusEventDate,
  StatusEventContent,
  StatusEventTitle,
  StatusEventAffected,
  StatusEventAffectedBadge,
  StatusEventTimelineReport,
  StatusEventTimelineMaintenance,
} from "@/components/blocks/status-events";

<StatusEventGroup>
  {/* Incident report */}
  <StatusEvent>
    <StatusEventAside>
      <StatusEventDate date={new Date("2024-01-15")} />
    </StatusEventAside>
    <StatusEventContent>
      <StatusEventTitle>API Latency Spike</StatusEventTitle>
      <StatusEventAffected>
        <StatusEventAffectedBadge>API</StatusEventAffectedBadge>
        <StatusEventAffectedBadge>Dashboard</StatusEventAffectedBadge>
      </StatusEventAffected>
      <StatusEventTimelineReport
        updates={[
          { status: "resolved", message: "All systems back to normal.", date: new Date("2024-01-15T14:00:00Z") },
          { status: "monitoring", message: "Fix deployed, monitoring.", date: new Date("2024-01-15T13:30:00Z") },
          { status: "investigating", message: "Looking into increased API latency.", date: new Date("2024-01-15T13:00:00Z") },
        ]}
      />
    </StatusEventContent>
  </StatusEvent>

  {/* Maintenance */}
  <StatusEvent>
    <StatusEventAside>
      <StatusEventDate date={new Date("2024-01-20")} />
    </StatusEventAside>
    <StatusEventContent>
      <StatusEventTitle>Database Migration</StatusEventTitle>
      <StatusEventAffected>
        <StatusEventAffectedBadge>Database</StatusEventAffectedBadge>
      </StatusEventAffected>
      <StatusEventTimelineMaintenance
        maintenance={{
          title: "Database Migration",
          message: "Upgrading to PostgreSQL 16",
          from: new Date("2024-01-20T02:00:00Z"),
          to: new Date("2024-01-20T04:00:00Z"),
        }}
      />
    </StatusEventContent>
  </StatusEvent>
</StatusEventGroup>
```

## Fetching Data with the SDK

Complete example fetching all data needed for a status page:

```typescript
import { createOpenStatusClient } from "@openstatus/sdk-node";

const client = createOpenStatusClient({
  apiKey: process.env.OPENSTATUS_API_KEY,
});

// Fetch page content (components, groups, reports, maintenances)
const content = await client.statusPage.v1.StatusPageService.getStatusPageContent({
  identifier: { case: "slug", value: "your-slug" },
});

// Fetch overall status
const { overallStatus, componentStatuses } =
  await client.statusPage.v1.StatusPageService.getOverallStatus({
    identifier: { case: "slug", value: "your-slug" },
  });

// Map to component props
const monitors = componentStatuses.map((cs) => ({
  id: cs.componentId,
  name: cs.name,
  status: mapToStatusType(cs.status), // map SDK status to "success" | "degraded" | "error" | "info"
  uptime: cs.uptimePercentage,
  barData: cs.dailyData, // map to StatusBarData[]
}));
```
