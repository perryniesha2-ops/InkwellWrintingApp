import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle errors from Supabase
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (code) {
    try {
      const supabase = await createServerClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("Exchange error:", exchangeError);
    } catch (err) {
      console.error("Callback error:", err);
    }
  }

  // No code — just redirect to dashboard if logged in, auth if not
  return NextResponse.redirect(`${origin}/dashboard`);
}