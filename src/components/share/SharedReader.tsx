import { Feather } from "lucide-react";
import { firstLineIndents, htmlToBlocks, type Block, type Run } from "@/lib/export/htmlBlocks";

export interface SharedChapter {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
}

/**
 * Read-only view of a shared book or chapter. Text is rendered from parsed
 * blocks as React elements (never injected as HTML), so nothing in the shared
 * content can run script in the reader's browser.
 */
function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.text.split("\n").map((part, j) => {
          let node: React.ReactNode = part;
          if (r.underline) node = <u>{node}</u>;
          if (r.italic) node = <em>{node}</em>;
          if (r.bold) node = <strong>{node}</strong>;
          return <span key={`${i}-${j}`}>{j > 0 && <br />}{node}</span>;
        }),
      )}
    </>
  );
}

function ChapterBody({ html }: { html: string }) {
  const blocks = htmlToBlocks(html);
  const indents = firstLineIndents(blocks);
  return (
    <>
      {blocks.map((b: Block, i) => {
        if (b.type === "sceneBreak") return <p key={i} style={{ textAlign: "center", margin: "1.5em 0", letterSpacing: "0.5em" }}>* * *</p>;
        if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
          return <h3 key={i} style={{ fontFamily: "var(--font-dm-sans)", fontSize: "1.1em", textAlign: "center", margin: "1.5em 0 0.75em" }}><Runs runs={b.runs} /></h3>;
        }
        const style: React.CSSProperties = { margin: 0, textIndent: indents[i] ? "1.5em" : 0, textAlign: b.align ?? "left" };
        if (b.type === "quote") return <blockquote key={i} style={{ margin: "1em 2em", fontStyle: "italic" }}><Runs runs={b.runs} /></blockquote>;
        if (b.type === "li") return <p key={i} style={{ margin: "0 0 0 1.5em" }}>{b.marker} <Runs runs={b.runs} /></p>;
        return <p key={i} style={style}><Runs runs={b.runs} /></p>;
      })}
    </>
  );
}

export default function SharedReader({ title, chapters }: { title: string; chapters: SharedChapter[] }) {
  const topLevel = chapters.filter((c) => !c.parentId);
  const showContents = topLevel.length > 1;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "0 16px" }}>
      <header style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 0 24px", borderBottom: "1px solid var(--border-color)" }}>
        <p style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 16px", fontFamily: "var(--font-inter)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-primary)" }}>
          <Feather style={{ width: "12px", height: "12px" }} /> Shared with you · read-only
        </p>
        <h1 style={{ margin: 0, fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{title}</h1>
        {showContents && (
          <nav aria-label="Contents" style={{ marginTop: "20px" }}>
            <ol style={{ margin: 0, paddingLeft: "1.2em", fontFamily: "var(--font-inter)", fontSize: "14px", lineHeight: 1.9 }}>
              {topLevel.map((c) => (
                <li key={c.id}><a href={`#ch-${c.id}`} style={{ color: "var(--text-secondary)" }}>{c.title || "Untitled"}</a></li>
              ))}
            </ol>
          </nav>
        )}
      </header>

      <article style={{ maxWidth: "680px", margin: "0 auto", padding: "16px 0 96px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.2rem", lineHeight: 1.75 }}>
        {chapters.map((c) => (
          <section key={c.id} id={`ch-${c.id}`} style={{ marginTop: c.parentId ? "2em" : "3.5em" }}>
            {c.parentId ? (
              <p style={{ textAlign: "center", margin: "0 0 1em", letterSpacing: "0.5em" }} aria-label={c.title}>* * *</p>
            ) : (
              <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "1.6rem", textAlign: "center", margin: "0 0 1.2em" }}>{c.title}</h2>
            )}
            <ChapterBody html={c.content} />
          </section>
        ))}
        {chapters.length === 0 && (
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "var(--text-muted)" }}>Nothing here yet.</p>
        )}
      </article>
    </main>
  );
}
