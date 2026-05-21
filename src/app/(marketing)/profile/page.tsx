import { LogOutIcon, ShieldIcon } from "lucide-react";

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

import { ProfileForm } from "./ProfileForm";

export const metadata = {
  title: "Your profile",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await requireUser("/profile");

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coming next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>· Cached translation (Phase 6)</p>
              <p>· Suggest a Telegram channel (Phase 7)</p>
              <p>· Saved searches &amp; alerts (Phase 11)</p>
            </CardContent>
          </Card>
        </div>
      </div>
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
