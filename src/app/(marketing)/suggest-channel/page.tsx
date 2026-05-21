import { Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSection } from "@/components/states/PageSection";
import { requireUser } from "@/lib/auth/requireUser";
import {
  fetchActiveCategories,
  fetchUserSuggestions,
} from "@/lib/channel-suggestions/queries";

import { ChannelSuggestionForm } from "./ChannelSuggestionForm";
import { SuggestionList } from "./SuggestionList";

export const metadata = {
  title: "Suggest a channel",
};

export const dynamic = "force-dynamic";

export default async function SuggestChannelPage() {
  const { user } = await requireUser("/suggest-channel");

  const [categories, suggestions] = await Promise.all([
    fetchActiveCategories(),
    fetchUserSuggestions(user.id),
  ]);

  return (
    <PageSection
      title="Suggest a Telegram channel"
      description="Know a public real estate channel we should ingest? Submit it and an admin will review."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <CardTitle className="text-base">New suggestion</CardTitle>
              <span className="text-xs text-muted-foreground">
                Public channels only — we can&apos;t ingest private ones.
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelSuggestionForm categories={categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Your suggestions
              <span className="ms-1 font-normal text-muted-foreground">
                · {suggestions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SuggestionList items={suggestions} />
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
