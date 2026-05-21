import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Create account",
};

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <SignupForm next={params.next} />;
}
