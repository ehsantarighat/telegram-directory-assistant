import Link from "next/link";

import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Terms of Service",
  description:
    "Rules for using Telegram Directory Assistant — what we provide, what we don't, and your responsibilities as a user.",
};

const UPDATED = "2026-05-23";
const CONTACT = "legal@telegram-directory-assistant.example";

export default function TermsPage() {
  return (
    <PageSection
      title="Terms of Service"
      description={`Last updated: ${UPDATED}`}
    >
      <article className="prose prose-sm max-w-3xl text-sm leading-relaxed text-foreground">
        <p>
          By using Telegram Directory Assistant (&quot;TDA&quot;,
          &quot;the service&quot;) you agree to these terms. Read them
          carefully — they limit our responsibility and set rules for
          how you can use the service.
        </p>

        <H2>1. What this service is</H2>
        <p>
          TDA is a <strong>directory</strong> that aggregates publicly-
          posted real-estate listings from public Telegram channels.
          We make those listings searchable, filterable, and
          translatable. We do <strong>not</strong>:
        </p>
        <ul className="list-disc pl-5">
          <li>Own, sell, rent, or manage any of the properties</li>
          <li>Verify the accuracy of any listing</li>
          <li>Mediate communication between buyers and sellers</li>
          <li>Hold or transfer money</li>
          <li>Guarantee that any listing is currently available</li>
        </ul>
        <p>
          Every listing carries an &quot;Open original on Telegram&quot;
          link. <strong>Always verify directly with the original
          source</strong> before signing anything or transferring
          money.
        </p>

        <H2>2. No warranty</H2>
        <p>
          The service is provided &quot;as is&quot;. We make no
          warranty that:
        </p>
        <ul className="list-disc pl-5">
          <li>Listings are accurate, current, or honestly posted</li>
          <li>Photos depict the actual property</li>
          <li>Prices, addresses, or contact details are correct</li>
          <li>The site will be available without interruption</li>
          <li>Translations preserve the exact original meaning</li>
        </ul>
        <p>
          You are solely responsible for your decisions. If you
          transfer money to anyone based on a listing you found here
          without independently verifying them, that is your risk.
        </p>

        <H2>3. Reporting bad listings</H2>
        <p>
          If you find a scam, duplicate, sold-out, or otherwise
          inaccurate listing, use the <strong>Report</strong> button
          on the listing detail page. Our admins review every report
          and remove confirmed problems. We thank you for it but
          can&apos;t pay or compensate for reports.
        </p>

        <H2>4. Your account</H2>
        <p>
          When you create an account you agree to:
        </p>
        <ul className="list-disc pl-5">
          <li>Provide a real, working email address</li>
          <li>Not share your account credentials</li>
          <li>Be responsible for everything done under your account</li>
          <li>Be at least 16 years old</li>
        </ul>
        <p>
          We may suspend or delete accounts that violate these terms
          without notice.
        </p>

        <H2>5. Acceptable use</H2>
        <p>You may not:</p>
        <ul className="list-disc pl-5">
          <li>
            Scrape, mirror, or republish the directory&apos;s content
            in bulk
          </li>
          <li>
            Use automated tools (bots, headless browsers) to make
            requests beyond normal human use
          </li>
          <li>
            Submit fake reports, fake channel suggestions, or spam
          </li>
          <li>
            Interfere with the service&apos;s operation or security
          </li>
          <li>
            Use the service to harass, defame, or commit fraud
            against any listed party
          </li>
        </ul>
        <p>
          Violations may result in immediate account suspension and,
          for serious cases, referral to the relevant authorities.
        </p>

        <H2>6. Channels you suggest</H2>
        <p>
          If you suggest a Telegram channel for inclusion in the
          directory:
        </p>
        <ul className="list-disc pl-5">
          <li>
            You confirm the channel is public and not your own
            private content
          </li>
          <li>
            You understand we may or may not accept the
            suggestion — admin decision is final
          </li>
          <li>
            You receive no payment, commission, or visibility
            for suggesting it
          </li>
        </ul>

        <H2>7. Source channels and their content</H2>
        <p>
          Telegram channel content is owned by the channel admins
          who posted it, not by us. We display it under fair-use
          aggregation for the purpose of helping users find
          listings, with a clear link back to the original source on
          every listing.
        </p>
        <p>
          If you are a channel admin and want your channel removed
          from the directory, email{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{" "}
          with proof you control the channel and we will remove it
          within 7 days.
        </p>

        <H2>8. Liability limit</H2>
        <p>
          To the maximum extent allowed by law, TDA, its operators,
          and its hosting providers are <strong>not liable</strong>{" "}
          for:
        </p>
        <ul className="list-disc pl-5">
          <li>Any loss arising from your use of any listing</li>
          <li>
            Loss of money, property, or opportunity from contacting
            or dealing with a listed party
          </li>
          <li>Service outages, data loss, or hacking incidents</li>
          <li>
            Errors or omissions in listing data, photos, or
            translations
          </li>
        </ul>
        <p>
          Where the law forbids excluding liability entirely, our
          total liability to you in any 12-month period is limited
          to the amount you paid us in that period — which for free
          accounts is zero.
        </p>

        <H2>9. Changes to the service</H2>
        <p>
          We may add, change, or remove features at any time. We
          aren&apos;t obligated to keep any specific channel,
          listing, or feature available.
        </p>

        <H2>10. Changes to these terms</H2>
        <p>
          When we update these terms, the new version replaces this
          page and the &quot;Last updated&quot; date changes.
          Continuing to use the service after a change means you
          accept the new terms.
        </p>

        <H2>11. Governing law</H2>
        <p>
          These terms are governed by the laws of the Republic of
          Uzbekistan. Disputes that can&apos;t be resolved by email
          go to the competent courts of Tashkent.
        </p>

        <H2>12. Contact</H2>
        <p>
          Questions about these terms? Email{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
        <p>
          See also our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
    </PageSection>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-2 text-lg font-semibold tracking-tight">
      {children}
    </h2>
  );
}
