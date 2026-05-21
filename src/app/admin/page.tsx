import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin · Overview",
};

const STATS = [
  { label: "Users", value: "—" },
  { label: "Active channels", value: "—" },
  { label: "Listings", value: "—" },
  { label: "Saved listings", value: "—" },
  { label: "Pending suggestions", value: "—" },
  { label: "Open removal requests", value: "—" },
] as const;

export default function AdminOverviewPage() {
  return (
    <AdminShell
      title="Overview"
      description="Operational health, channels, and content moderation."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            <Badge variant="secondary">Phase 8 placeholder</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Real metrics wire up in Phase 8 once the schema is migrated
            (Phase 2) and seed data lands (Phase 3). Role-gating is stubbed —
            this page is currently reachable by anyone.
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
