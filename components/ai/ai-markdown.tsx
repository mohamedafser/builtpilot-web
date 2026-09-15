import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function inline(value: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(value))) {
    if (match.index > last) {
      parts.push(value.slice(last, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold text-stone-900">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      parts.push(
        <code
          key={key}
          className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.8em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    key += 1;
    last = match.index + token.length;
  }

  if (last < value.length) {
    parts.push(value.slice(last));
  }

  return parts;
}

function parseTable(rows: string[]): ReactNode {
  const cells = rows.map((row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
  const header = cells[0] ?? [];
  const body = cells.slice(2);

  return (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {header.map((cell) => (
              <th
                key={cell}
                className="border-b border-stone-200 px-3 py-2 font-semibold text-stone-800"
              >
                {inline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, index) => (
            <tr key={index} className="border-b border-stone-100">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-stone-700">
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AIMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("|") && lines[index + 1]?.includes("---")) {
      const table: string[] = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        table.push(lines[index]);
        index += 1;
      }
      blocks.push(<div key={`t-${index}`}>{parseTable(table)}</div>);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s/, "");
      const Heading = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as
        | "h3"
        | "h4"
        | "h5";
      blocks.push(
        <Heading
          key={`h-${index}`}
          className={cn(
            "mt-4 mb-2 font-semibold text-stone-900 first:mt-0",
            level === 1 ? "text-lg" : "text-base",
          )}
        >
          {inline(text)}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      const ordered = /^\d+\.\s/.test(line);
      while (
        index < lines.length &&
        (ordered ? /^\d+\.\s/.test(lines[index]) : /^[-*]\s/.test(lines[index]))
      ) {
        items.push(lines[index].replace(/^([-*]|\d+\.)\s/, ""));
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={`l-${index}`}
          className={cn(
            "my-2 space-y-1 pl-5 text-sm text-stone-700",
            ordered ? "list-decimal" : "list-disc",
          )}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("|") &&
      !/^#{1,3}\s/.test(lines[index]) &&
      !/^[-*]\s/.test(lines[index]) &&
      !/^\d+\.\s/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-2 text-sm leading-6 text-stone-700">
        {inline(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className={cn("max-w-none", className)}>{blocks}</div>;
}
