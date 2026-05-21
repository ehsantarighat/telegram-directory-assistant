import Link from "next/link";
import { UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <PageSection
      phase="Phase 1 · Placeholder"
      title="Your profile"
      description="Sign-in, preferred language, content mode (original vs translated), and account preferences land in Phase 5."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={UserIcon}
              title="Not signed in"
              description="Sign in to manage your saved listings, language preferences, and channel suggestions."
              action={
                <Button render={<Link href="/login" />}>Sign in</Button>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>· Preferred language (EN / RU / UZ / FA)</p>
            <p>· Content mode: original or translated</p>
            <p>· Saved searches &amp; alerts (Phase 11)</p>
            <p>· Admin tools (for admins only)</p>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
