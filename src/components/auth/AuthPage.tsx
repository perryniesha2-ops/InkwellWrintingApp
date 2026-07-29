"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Feather, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const QUOTES = [
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "You have to write the book that wants to be written.", author: "Madeleine L'Engle" },
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { text: "The first draft is just you telling yourself the story.", author: "Terry Pratchett" },
];

const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

export  function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // In handleSubmit, replace the signup block:
if (mode === "signup") {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  // No email confirmation — sign them in immediately
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  router.push("/dashboard");
  router.refresh();
} else {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  router.push("/dashboard");
  router.refresh();
}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "var(--font-inter)",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col"
        style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-color)", position: "relative" }}>

        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(212,168,67,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.04) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        {/* Gold left line */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "2px", background: "linear-gradient(to bottom, transparent, var(--gold-primary), transparent)" }} />

        {/* Logo */}
        <div style={{ padding: "2rem 2.5rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Feather style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Prosr
            </span>
          </div>
        </div>

        {/* Quote */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "2.5rem 3rem", position: "relative", zIndex: 1 }}>
          <div style={{ width: "32px", height: "2px", background: "var(--gold-primary)", marginBottom: "2rem" }} />
          <blockquote>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", lineHeight: 1.3, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
              &quot;{quote.text}&quot;
            </p>
            <footer style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "20px", height: "1px", background: "var(--gold-primary)", opacity: 0.5 }} />
              <span style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>
                {quote.author}
              </span>
            </footer>
          </blockquote>

          {/* Feature list */}
          <div style={{ marginTop: "3rem", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              "AI that knows your characters by name",
              "Chapter proofreader & consistency checker",
              "Readability analysis & scene illustrator",
              "Beautiful EPUB export with custom styles",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "4px", height: "4px", background: "var(--gold-primary)", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Genre tags */}
        <div style={{ padding: "2rem 2.5rem", position: "relative", zIndex: 1, borderTop: "1px solid var(--border-color)", display: "flex", gap: "8px" }}>
          {["Romance", "Thriller", "Fantasy", "Literary"].map((g) => (
            <span key={g} style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.06em", padding: "4px 10px", color: "var(--gold-primary)", border: "1px solid var(--gold-border)" }}>
              {g.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-4">
            <Feather style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
              Prosr
            </span>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", padding: "3px", gap: "2px" }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{
                  flex: 1, padding: "8px",
                  fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: mode === m ? "var(--gold-primary)" : "transparent",
                  color: mode === m ? "var(--bg-primary)" : "var(--text-muted)",
                }}>
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Google sign in */}
          <button
            onClick={() => void handleGoogleSignIn()}
            disabled={loading}
            style={{
              width: "100%", padding: "10px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="#4285F4"/>
              <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.58-2a4.8 4.8 0 01-2.72.75 4.8 4.8 0 01-4.52-3.32H.82v2.06A8 8 0 008 16z" fill="#34A853"/>
              <path d="M3.48 9.49A4.8 4.8 0 013.24 8c0-.52.09-1.02.24-1.49V4.45H.82A8 8 0 000 8c0 1.29.31 2.51.82 3.55l2.66-2.06z" fill="#FBBC05"/>
              <path d="M8 3.2a4.34 4.34 0 013.07 1.2l2.3-2.3A7.7 7.7 0 008 0 8 8 0 00.82 4.45L3.48 6.5A4.8 4.8 0 018 3.2z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
            <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
              placeholder="your@email.com"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: "40px" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "flex" }}>
                {showPassword
                  ? <EyeOff style={{ width: "14px", height: "14px" }} />
                  : <Eye style={{ width: "14px", height: "14px" }} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "12px", fontFamily: "var(--font-inter)" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", fontSize: "12px", fontFamily: "var(--font-inter)" }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "11px",
              background: email && password ? "var(--gold-primary)" : "var(--bg-elevated)",
              color: email && password ? "var(--bg-primary)" : "var(--text-dim)",
              border: "none",
              cursor: email && password ? "pointer" : "not-allowed",
              fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.15s",
              opacity: loading ? 0.7 : 1,
            }}>
            {loading
              ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" /> {mode === "signin" ? "Signing in…" : "Creating account…"}</>
              : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          {/* Forgot password */}
          {mode === "signin" && (
            <button
              onClick={async () => {
                if (!email) { setError("Enter your email first."); return; }
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/auth/callback`,
                });
                setLoading(false);
                if (error) setError(error.message);
                else setSuccess("Password reset email sent.");
              }}
              style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", textAlign: "center", width: "100%" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
              Forgot password?
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}