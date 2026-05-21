import { BellIcon, LogOutIcon, ShieldIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageSection } from "@/components/states/PageSection";
import { signOutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/requireUser";
import { fetchUserSavedSearches } from "@/lib/saved-searches/queries";

import { ProfileForm } from "./ProfileForm";
import { SavedSearchesList } from "./SavedSearchesList";

export const metadata = {
  title: "Your profile",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await requireUser("/profile");
  const savedSearches = await fetchUserSavedSearches(user.id);

  return (
    <PageSection
      title="Your profile"
      description={
        profile.name
          ? `Signed in as ${profile.name} · ${user.email}`
          : `Signed in as ${user.email}`
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Email" value={user.email ?? ""} />
              <Row
                label="Role"
                value={
                  <span className="inline-flex items-center gap-1">
                    {profile.role === "admin" && (
                      <ShieldIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
                    )}
                    <span className="capitalize">{profile.role}</span>
                  </span>
                }
              />
              <Row
                label="Plan"
                value={
                  <Badge variant="secondary" className="capitalize">
                    {profile.plan}
                  </Badge>
                }
              />
              <Row
                label="Member since"
                value={new Date(profile.createdAt).toLocaleDateString()}
              />
              <div className="pt-2">
                <form action={signOutAction}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
                    Sign out
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Saved searches</CardTitle>
            <span className="font-normal text-muted-foreground">
              · {savedSearches.length}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <BellIcon className="h-3 w-3" aria-hidden />
            Alerts coming soon
          </span>
        </CardHeader>
        <CardContent>
          <SavedSearchesList items={savedSearches} />
        </CardContent>
      </Card>
    </PageSection>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
