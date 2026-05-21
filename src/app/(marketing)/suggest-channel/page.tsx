import { Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Suggest a channel",
};

export default function SuggestChannelPage() {
  return (
    <PageSection
      phase="Phase 1 · Placeholder"
      title="Suggest a Telegram channel"
      description="Know a public real estate channel we should ingest? Submit it and an admin will review. Submission flow lands in Phase 7 — the form below is preview-only."
    >
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <CardTitle className="text-base">Preview</CardTitle>
            <span className="text-xs text-muted-foreground">
              Not yet wired to the database
            </span>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Phase 7
          </Badge>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <div className="grid gap-1.5">
              <label
                htmlFor="channel-url"
                className="text-sm font-medium"
              >
                Telegram channel URL or @username
              </label>
              <Input
                id="channel-url"
                placeholder="https://t.me/uz_realty_tashkent"
                disabled
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="city" className="text-sm font-medium">
                Suggested city
              </label>
              <Input id="city" placeholder="Tashkent" disabled />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="note" className="text-sm font-medium">
                Note (optional)
              </label>
              <Input
                id="note"
                placeholder="What kind of listings does this channel post?"
                disabled
              />
            </div>
            <Button type="button" disabled>
              Submit suggestion
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageSection>
  );
}
