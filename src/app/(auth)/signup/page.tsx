import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <Badge variant="secondary">Phase 5</Badge>
        </div>
        <CardDescription>
          Save listings, suggest channels, and choose your preferred language.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" aria-disabled>
          <div className="grid gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <Input id="name" placeholder="Your name" disabled />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              disabled
            />
          </div>
          <Button type="button" disabled>
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="text-xs">Real Supabase Auth wiring lands in Phase 5.</p>
      </CardFooter>
    </Card>
  );
}
