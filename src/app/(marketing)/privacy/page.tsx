import Link from "next/link";

import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Telegram Directory Assistant collects, uses, and protects your data.",
};

const UPDATED = "2026-05-23";
const CONTACT = "privacy@telegram-directory-assistant.example";

export default function PrivacyPolicyPage() {
  return (
    <PageSection
      title="Privacy Policy"
      description={`Last updated: ${UPDATED}`}
    >
      <article className="prose prose-sm max-w-3xl text-sm leading-relaxed text-foreground">
        <p>
          Telegram Directory Assistant (&quot;TDA&quot;, &quot;the
          service&quot;, &quot;we&quot;) operates a public directory
          of real-estate listings sourced from public Telegram
          channels. This policy explains what we collect, why, and
          who we share it with.
        </p>

        <H2>1. What we collect</H2>

        <H3>From visitors (no account required)</H3>
        <ul className="list-disc pl-5">
          <li>
            <strong>Page view counts</strong> per listing, aggregated
            (not tied to your identity).
          </li>
          <li>
            <strong>Session cookies</strong> for browser-internal
            state (filter memory, last-viewed listings URL). Stored
            in your browser&apos;s <code>sessionStorage</code> and
            cleared when you close the tab.
          </li>
          <li>
            <strong>Standard request logs</strong> at the hosting
            level (IP address, user-agent, URL requested). Retained
            for 14 days by our host (Railway) for abuse and
            debugging only.
          </li>
        </ul>

        <H3>From signed-in users</H3>
        <ul className="list-disc pl-5">
          <li>
            <strong>Email address</strong> (via Supabase Auth)
          </li>
          <li>
            <strong>Display name</strong>, role, plan tier — stored
            in our <code>user_profiles</code> table
          </li>
          <li>
            <strong>Saved listings</strong> and{" "}
            <strong>saved searches</strong> you create
          </li>
          <li>
            <strong>Reports / removal requests</strong> you submit
            (we store the listing id and your reason; your email is
            only included if you opt in)
          </li>
        </ul>

        <H3>From Telegram (public content only)</H3>
        <p>
          Our scraper reads the public preview pages of channels
          you or other admins add (
          <code>https://t.me/s/&lt;username&gt;</code>). We do{" "}
          <strong>not</strong> read private channels, direct
          messages, or any data tied to individual Telegram users.
        </p>

        <H2>2. How we use it</H2>
        <ul className="list-disc pl-5">
          <li>Operate the directory: search, filters, sort, saved items</li>
          <li>Authenticate and authorize signed-in users</li>
          <li>
            Track listing popularity (views, saves) for ordering and
            admin reporting
          </li>
          <li>
            Translate listing text on demand using a third-party LLM
            (Anthropic Claude). Only the listing text is sent — never
            your account data.
          </li>
          <li>Detect and respond to abuse</li>
        </ul>

        <H2>3. Who we share data with</H2>
        <table className="not-prose w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3">Processor</th>
              <th className="py-2">What they receive</th>
            </tr>
          </thead>
          <tbody>
            <Row
              who="Supabase (DB + Auth)"
              what="All user account data and listings. Hosted in AP-Southeast-1."
            />
            <Row
              who="Railway (hosting)"
              what="HTTP request logs, app server logs."
            />
            <Row
              who="Anthropic (Claude Haiku)"
              what="Telegram post text only — for structured extraction and translation. No user account data."
            />
            <Row
              who="Yandex.Direct (planned)"
              what="Standard ad-network cookies + IP. Only loaded for visitors who haven't opted out. We will update this policy when ads launch."
            />
            <Row
              who="Telegram (read-only)"
              what="We fetch public channel preview HTML. We don't send any user data to Telegram."
            />
          </tbody>
        </table>

        <H2>4. Cookies & local storage</H2>
        <p>
          We use the minimum necessary:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Auth session cookie</strong> — set by Supabase
            when you sign in; lets us identify you on subsequent
            requests. Expires when you sign out.
          </li>
          <li>
            <strong>Filter memory</strong> — <code>sessionStorage</code>{" "}
            key remembering the last <code>/listings</code> URL you
            visited. Cleared when you close the tab.
          </li>
          <li>
            <strong>Theme preference</strong> — if you choose a
            dark/light theme, stored in <code>localStorage</code>.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> use analytics cookies, fingerprinting,
          or third-party trackers today. If we add advertising via
          Yandex.Direct, the ad network will set its own cookies;
          this policy will be updated and a banner shown.
        </p>

        <H2>5. Your rights</H2>
        <p>
          You can request the following at any time by emailing{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          :
        </p>
        <ul className="list-disc pl-5">
          <li>Access — a copy of the data we hold about you</li>
          <li>
            Deletion — we remove your account, saved items, and
            saved searches
          </li>
          <li>Correction — fix incorrect data</li>
          <li>
            Export — your saved listings and searches in JSON
          </li>
        </ul>
        <p>
          We respond within 30 days. Account deletion is
          irreversible.
        </p>

        <H2>6. Children</H2>
        <p>
          The service is intended for users 16 and older. We do not
          knowingly collect data from anyone under 16.
        </p>

        <H2>7. Changes to this policy</H2>
        <p>
          When we update this policy, the new version replaces this
          page and the &quot;Last updated&quot; date changes. Material
          changes (new data sharing, new processors) will be
          announced via an in-app notice the next time you visit.
        </p>

        <H2>8. Contact</H2>
        <p>
          Questions or concerns? Email{" "}
          <a className="underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className="underline">
            Terms of Service
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

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 mb-1 text-base font-semibold">{children}</h3>
  );
}

function Row({ who, what }: { who: string; what: string }) {
  return (
    <tr className="border-b border-border align-top">
      <td className="py-3 pr-3 font-medium text-foreground">{who}</td>
      <td className="py-3 text-muted-foreground">{what}</td>
    </tr>
  );
}
