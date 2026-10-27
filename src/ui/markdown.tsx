// markdown.tsx — renders src/markdown.ts's tree as elements (never as HTML).
import { type Inline, parse } from "../markdown";

function Spans({ c }: { c: Inline[] }) {
  return <>{c.map((x) =>
    x.t === "text" ? x.s
    : x.t === "br" ? <br />
    : x.t === "code" ? <code>{x.s}</code>
    : x.t === "b" ? <b><Spans c={x.c} /></b>
    : x.t === "i" ? <i><Spans c={x.c} /></i>
    : <a href={x.href} target="_blank" rel="noopener noreferrer"><Spans c={x.c} /></a>)}</>;
}

export function Markdown({ text }: { text: string }) {
  return (
    <div class="md">
      {parse(text).map((b) =>
        b.t === "p" ? <p><Spans c={b.c} /></p>
        : b.t === "h" ? <h4><Spans c={b.c} /></h4>
        : b.t === "pre" ? <pre>{b.s}</pre>
        : b.t === "ul" ? <ul>{b.items.map((c) => <li><Spans c={c} /></li>)}</ul>
        : <ol>{b.items.map((c) => <li><Spans c={c} /></li>)}</ol>)}
    </div>
  );
}
