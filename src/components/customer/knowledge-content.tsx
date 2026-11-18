import { Fragment, type ReactNode } from "react";
import { internalLink } from "@/lib/chatbot-types";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && internalLink(link[2]))
      return (
        <a key={index} href={link[2]}>
          {link[1]}
        </a>
      );
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Small Markdown subset for customer guides. React escapes raw HTML; only public internal links become anchors. */
export function KnowledgeContent({ text }: { text: string }) {
  const blocks: ReactNode[] = [],
    lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length;) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    if (lines[i].startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={i}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const heading = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const content = inline(heading[2]);
      blocks.push(heading[1].length <= 2 ? <h2 key={i}>{content}</h2> : <h3 key={i}>{content}</h3>);
      i++;
      continue;
    }
    const list = lines[i].match(/^\s*(?:([-*+])|\d+\.)\s+(.+)$/);
    if (list) {
      const ordered = !list[1],
        items: ReactNode[] = [];
      while (i < lines.length) {
        const item = lines[i].match(ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
        if (!item) break;
        items.push(<li key={i}>{inline(item[1])}</li>);
        i++;
      }
      blocks.push(ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>);
      continue;
    }
    const paragraph = [lines[i++]];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*(?:[-*+]|\d+\.)\s)/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    blocks.push(<p key={i}>{inline(paragraph.join("\n"))}</p>);
  }
  return <div className="at-knowledge-content">{blocks}</div>;
}
