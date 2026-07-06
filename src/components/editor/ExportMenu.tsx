"use client";

import { useState, useEffect, useRef } from "react";
import { Download, FileText, File, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface DocumentSection {
  type: string;
  title: string;
  content: string;
}

interface ExportMenuProps {
  title: string;
  content: string;
  genre?: string;
  documentId?: string;
}

export default function ExportMenu({
  title,
  content,
  genre,
  documentId,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  };

  const getSections = async (): Promise<DocumentSection[]> => {
    if (!documentId) return [];
    const res = await fetch(`/api/documents/${documentId}/sections`);
    if (!res.ok) return [];
    return res.json();
  };

  const getPlainText = () => {
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.innerText;
  };

  const buildSectionHtml = (
    sections: DocumentSection[],
    docTitle: string,
    docGenre?: string,
  ) => {
    return sections
      .map((s) => {
        if (s.type === "cover")
          return `<div class="title-page"><h1>${docTitle}</h1>${s.content ? `<p>${s.content}</p>` : ""}${docGenre ? `<p class="genre">${docGenre}</p>` : ""}</div>`;
        if (s.type === "table_of_contents")
          return `<div style="page-break-after:always;"><h2>${s.title || "Table of Contents"}</h2></div>`;
        return `<div style="page-break-after:always;">${s.title ? `<h2>${s.title}</h2>` : ""}<div>${s.content.replace(/\n/g, "<br/>")}</div></div>`;
      })
      .join("");
  };

  const handleTxt = async () => {
    setOpen(false);
    setExporting("txt");
    try {
      const sections = await getSections();
      const sectionText = sections
        .map(
          (s) =>
            `${s.title ? s.title.toUpperCase() + "\n\n" : ""}${s.content}\n\n${"─".repeat(40)}\n\n`,
        )
        .join("");
      const blob = new Blob([sectionText + getPlainText()], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const handlePdf = async () => {
    setOpen(false);
    setExporting("pdf");
    try {
      const sections = await getSections();
      const hasCover = sections.some((s) => s.type === "cover");
      const frontMatter = buildSectionHtml(sections, title, genre);
      const win = window.open("", "_blank");
      if (!win) {
        alert("Allow pop-ups to export PDF.");
        return;
      }
      win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Cormorant Garamond',Georgia,serif; font-size:12pt; line-height:1.8; color:#111; padding:1in; max-width:8.5in; margin:0 auto; }
          h1 { font-size:24pt; margin:2em 0 1em; page-break-after:avoid; }
          h2 { font-size:18pt; margin:1.5em 0 0.75em; }
          p { margin-bottom:1em; text-align:justify; }
          .title-page { text-align:center; padding-top:3in; page-break-after:always; }
          .title-page h1 { font-size:32pt; }
          @page { margin:1in; }
          @media print { h1 { page-break-before:always; } h1:first-of-type { page-break-before:avoid; } }
        </style></head><body>
        ${frontMatter}
        ${!hasCover ? `<div class="title-page"><h1>${title}</h1>${genre ? `<p>${genre}</p>` : ""}</div>` : ""}
        ${content}
      </body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 1000);
    } finally {
      setExporting(null);
    }
  };

  const handleDocx = async () => {
    setOpen(false);
    setExporting("docx");
    try {
      const sections = await getSections();
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        HeadingLevel,
        AlignmentType,
      } = await import("docx");
      const { saveAs } = await import("file-saver");
      type TRun = InstanceType<typeof TextRun>;
      type TPara = InstanceType<typeof Paragraph>;
      const paragraphs: TPara[] = [];
      const hasCover = sections.some((s) => s.type === "cover");

      sections.forEach((s) => {
        if (s.type === "cover") {
          paragraphs.push(
            new Paragraph({
              text: title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { before: 3000, after: 400 },
            }),
          );
          if (s.content)
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: s.content, italics: true })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              }),
            );
        } else if (s.type !== "table_of_contents") {
          if (s.title)
            paragraphs.push(
              new Paragraph({
                text: s.title,
                heading: HeadingLevel.HEADING_1,
                pageBreakBefore: true,
              }),
            );
          s.content
            .split("\n")
            .filter(Boolean)
            .forEach((line: string) => {
              paragraphs.push(
                new Paragraph({
                  children: [new TextRun({ text: line })],
                  spacing: { after: 200 },
                }),
              );
            });
        }
      });

      if (!hasCover) {
        paragraphs.push(
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 3000, after: 400 },
          }),
        );
        if (genre)
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: genre, italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 3000 },
            }),
          );
      }

      const div = document.createElement("div");
      div.innerHTML = content;
      div.childNodes.forEach((node) => {
        const el = node as HTMLElement;
        const tag = el.tagName?.toLowerCase();
        const text = el.innerText ?? el.textContent ?? "";
        if (!text.trim()) return;
        if (tag === "h1")
          paragraphs.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 480, after: 240 },
              pageBreakBefore: paragraphs.length > 2,
            }),
          );
        else if (tag === "h2")
          paragraphs.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 360, after: 180 },
            }),
          );
        else if (tag === "h3")
          paragraphs.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 },
            }),
          );
        else if (tag === "p") {
          const runs: TRun[] = [];
          el.childNodes.forEach((child) => {
            const ce = child as HTMLElement;
            const ct = ce.tagName?.toLowerCase();
            const cx = ce.textContent ?? "";
            if (!cx) return;
            runs.push(
              new TextRun({
                text: cx,
                bold: ct === "strong" || ct === "b",
                italics: ct === "em" || ct === "i",
                underline: ct === "u" ? {} : undefined,
              }),
            );
          });
          paragraphs.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text })],
              spacing: { after: 200 },
            }),
          );
        }
      });

      const doc = new Document({
        creator: "Inkwell",
        title,
        description: genre ?? "",
        styles: {
          default: {
            document: {
              run: { font: "Garamond", size: 24 },
              paragraph: { spacing: { line: 360 } },
            },
          },
        },
        sections: [{ children: paragraphs }],
      });
      saveAs(await Packer.toBlob(doc), `${title}.docx`);
    } catch (err) {
      console.error("DOCX export error:", err);
    } finally {
      setExporting(null);
    }
  };

  const ITEMS = [
    { label: "Word Document", ext: ".docx", icon: File, action: handleDocx },
    { label: "PDF", ext: ".pdf", icon: FileText, action: handlePdf },
    { label: "Plain Text", ext: ".txt", icon: FileText, action: handleTxt },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        disabled={!!exporting}
        className="flex items-center gap-1.5 transition-colors flex-shrink-0"
        style={{
          fontSize: "12px",
          fontFamily: "Inter",
          fontWeight: 500,
          color: open ? "var(--text-primary)" : "var(--text-muted)",
          padding: "6px 10px",
          background: open ? "var(--bg-elevated)" : "transparent",
          border: "1px solid",
          borderColor: open ? "var(--border-color)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!open)
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        {exporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {exporting ? "Exporting…" : "Export"}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
              zIndex: 99999,
              minWidth: "180px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                }}
              >
                Export As
              </span>
            </div>
            {ITEMS.map(({ label, ext, icon: Icon, action }) => (
              <button
                key={ext}
                onClick={() => void action()}
                className="w-full flex items-center gap-3 text-left transition-colors"
                style={{
                  padding: "10px 12px",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  fontFamily: "Inter",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--bg-elevated)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                <Icon
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "var(--text-dim)" }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  {ext}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
