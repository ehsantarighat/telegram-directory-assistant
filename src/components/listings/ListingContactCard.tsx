import { MessageCircleIcon, PhoneIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  contactPhone: string | null;
  contactTelegram: string | null;
};

/**
 * Direct contact card. Tappable on mobile (tel: + t.me deep link).
 * No contact info → hide.
 */
export function ListingContactCard({ contactPhone, contactTelegram }: Props) {
  if (!contactPhone && !contactTelegram) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Contact
      </h3>
      <div className="flex flex-col gap-2">
        {contactPhone && (
          <Button
            render={<a href={`tel:${contactPhone}`} />}
            variant="outline"
            className="justify-start gap-2 font-mono"
          >
            <PhoneIcon className="h-4 w-4" aria-hidden />
            {contactPhone}
          </Button>
        )}
        {contactTelegram && (
          <Button
            render={
              <a
                href={`https://t.me/${contactTelegram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            className="justify-start gap-2"
          >
            <MessageCircleIcon className="h-4 w-4" aria-hidden />
            {contactTelegram}
          </Button>
        )}
      </div>
    </Card>
  );
}
