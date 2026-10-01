import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import SharedReader, { type SharedChapter } from "@/components/share/SharedReader";

type PageProps = { params: Promise<{ token: string }> };

interface Shared {
  role: "view" | "edit";
  documentId: string;
  chapterId: string | null;
  title: string;
  chapters: SharedChapter[];
}

async function loadShare(token: string): Promise<Shared | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("get_shared", { p_token: token });
  return (data as Shared | null) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const shared = await loadShare((await params).token);
  return {
    title: shared ? `${shared.title} · Prosr` : "Link unavailable · Prosr",
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const shared = await loadShare(token);

  if (!shared) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: "22px", color: "var(--text-primary)", margin: "0 0 8px" }}>This link isn&apos;t available</h1>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            It may have been turned off by the author. Ask them for a new link.
          </p>
        </div>
      </main>
    );
  }

  if (shared.role === "edit") {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/auth?next=${encodeURIComponent(`/share/${token}`)}`);
    const { data, error } = await supabase.rpc("accept_share", { p_token: token });
    if (!error && data) {
      const { documentId, chapterId } = data as { documentId: string; chapterId: string | null };
      redirect(`/editor/${documentId}${chapterId ? `?chapter=${chapterId}` : ""}`);
    }
  }

  return <SharedReader title={shared.title} chapters={shared.chapters} />;
}
