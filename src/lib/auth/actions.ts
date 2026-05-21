"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  next: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password required"),
  next: z.string().optional(),
});

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

/** Where the email-confirmation callback lands. */
async function getEmailRedirectTo(): Promise<string> {
  const h = await headers();
  const origin =
    h.get("origin") ??
    h.get("x-forwarded-host")
      ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host")}`
      : env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${origin}/auth/callback`;
}

function safeNext(input: unknown): string {
  if (typeof input !== "string") return "/profile";
  if (!input.startsWith("/")) return "/profile";
  // Avoid // (protocol-relative) and tab characters
  if (input.startsWith("//")) return "/profile";
  return input;
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: await getEmailRedirectTo(),
      data: { name: parsed.data.name },
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is required, Supabase returns user with empty
  // session and we need to show a "check your email" state.
  if (data.user && !data.session) {
    return {
      ok: true,
      message:
        "Check your email — we sent a confirmation link to finish creating your account.",
    };
  }

  // Confirmation disabled in Supabase settings → session is live, redirect.
  redirect(safeNext(parsed.data.next));
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect(safeNext(parsed.data.next));
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
