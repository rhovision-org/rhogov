// markdown.ts — the small subset of Markdown a vote's description may use (#94):
// paragraphs, line breaks, headings, bullet and numbered lists, code, **bold**,
// *italic*, `code`, and links. Pure: it returns a tree the UI renders as elements,
// never as HTML, so nothing typed into a description can run in the page.
// Images are deliberately not supported: showing one would make the page fetch
// from a third party, and rhogov's only network peer is the node (CLAUDE.md).

export type Inline =
  | { t: "text"; s: string }
  | { t: "b"; c: Inline[] }
  | { t: "i"; c: Inline[] }
  | { t: "code"; s: string }
  | { t: "a"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "pre"; s: string };

/** Only web links: no javascript:, data:, or anything else a click could run. */
export const safeHref = (url: string) => (/^https?:\/\/[^\s<>"]+$/i.test(url) ? url : null);

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*[^*\n]+?\*|_[^_\n]+?_)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/;

export function inline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { out.push({ t: "text", s: rest }); break; }
    if (m.index) out.push({ t: "text", s: rest.slice(0, m.index) });
    const tok = m[0];
    if (m[1]) out.push({ t: "code", s: tok.slice(1, -1) });
    else if (m[2]) out.push({ t: "b", c: inline(tok.slice(2, -2)) });
    else if (m[3]) out.push({ t: "i", c: inline(tok.slice(1, -1)) });
    else if (m[4]) {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = safeHref(url);
      out.push(href ? { t: "a", href, c: inline(label) } : { t: "text", s: tok });
    } else out.push({ t: "a", href: tok, c: [{ t: "text", s: tok }] });
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

const withBreaks = (lines: string[]) => lines.flatMap((l, k) => (k ? [{ t: "br" } as Inline, ...inline(l)] : inline(l)));

export function parse(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let k = 0;
  while (k < lines.length) {
    const line = lines[k];
    if (!line.trim()) { k++; continue; }
    if (/^```/.test(line)) {
      const body: string[] = [];
      for (k++; k < lines.length && !/^```/.test(lines[k]); k++) body.push(lines[k]);
      blocks.push({ t: "pre", s: body.join("\n") });
      k++;
      continue;
    }
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) { blocks.push({ t: "h", c: inline(h[1]) }); k++; continue; }
    const list = (re: RegExp, t: "ul" | "ol") => {
      const items: Inline[][] = [];
      while (k < lines.length && re.test(lines[k])) items.push(inline(lines[k++].replace(re, "")));
      blocks.push({ t, items });
    };
    if (/^\s*[-*+]\s+/.test(line)) { list(/^\s*[-*+]\s+/, "ul"); continue; }
    if (/^\s*\d+[.)]\s+/.test(line)) { list(/^\s*\d+[.)]\s+/, "ol"); continue; }
    const para: string[] = [];
    while (k < lines.length && lines[k].trim() && !/^(```|#{1,6}\s|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[k])) para.push(lines[k++]);
    blocks.push({ t: "p", c: withBreaks(para) });
  }
  return blocks;
}
