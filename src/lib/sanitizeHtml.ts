const BLOCKED_TAGS = "script, style, iframe, object, embed, link, meta, form, input, button, textarea";

/**
 * Strip scripts, event handlers and javascript: URLs from manuscript HTML
 * before rendering it outside the editor (e.g. revision previews). Browser only.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const unsafeUrl = (name === "href" || name === "src") && /^\s*(javascript|data):/i.test(attr.value);
      if (name.startsWith("on") || unsafeUrl) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}
