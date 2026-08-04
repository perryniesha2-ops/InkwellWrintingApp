"use client";

import { useState, useEffect, useRef } from "react";
import { Download, FileText, File, Loader2, BookOpen } from "lucide-react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";


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
const EpubExportModal = dynamic(
  () => import("@/components/editor/EpubExportModal"),
  { ssr: false }
);

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
  const [epubModalOpen, setEpubModalOpen] = useState(false);


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
const handleEpub = async () => {
  setOpen(false);
  setExporting("epub");
  try {
    if (!documentId) {
      alert("Save your document first before exporting.");
      return;
    }

    const response = await fetch(`/api/documents/${documentId}/export/epub`);
    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "manuscript"}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("EPUB export error:", err);
    alert("EPUB export failed. Please try again.");
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
    setExporting("docx");
  try {
    if (!documentId) {
      alert("Save your document first before exporting.");
      return;
    }

    const response = await fetch(`/api/documents/${documentId}/export/docx`);
    if (!response.ok) {
      const err = await response.json() as { error: string };
      throw new Error(err.error ?? "Export failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "manuscript").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("DOCX export error:", err);
    alert("DOCX export failed. Please try again.");
  } finally {
    setExporting(null);
  }
};
  const ITEMS = [
  { label: "Word Document", ext: ".docx", icon: File,     action: handleDocx, note: "" },
  { label: "EPUB",          ext: ".epub", icon: BookOpen, action: () => { setOpen(false); setEpubModalOpen(true); }, note: "For proofing & ARC copies" },
  { label: "Plain Text",    ext: ".txt",  icon: FileText, action: handleTxt,  note: "" },
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
           {ITEMS.map(({ label, ext, icon: Icon, action, note }) => (
  <button
    key={ext}
    onClick={() => void action()}
    className="w-full flex items-center gap-3 text-left transition-colors"
    style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: "13px", fontFamily: "var(--font-inter)", background: "transparent", border: "none", cursor: "pointer" }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.background = "transparent";
      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
    }}>
    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-dim)" }} />
    <div style={{ flex: 1 }}>
      <span style={{ display: "block" }}>{label}</span>
      {note && (
        <span style={{ fontSize: "10px", color: "var(--text-dim)", fontStyle: "italic" }}>{note}</span>
      )}
    </div>
    <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-inter)" }}>{ext}</span>
  </button>
))}
\          </div>,
          document.body,
        )}
        {/* EPUB modal */}
    {epubModalOpen && documentId && (
      <EpubExportModal
        isOpen={epubModalOpen}
        onClose={() => setEpubModalOpen(false)}
        documentId={documentId}
        title={title}
      />
    )}
  </>
);
}
