"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="text-base font-semibold mt-4 first:mt-0 mb-2 text-foreground border-b border-border/60 pb-1">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="text-sm font-semibold mt-3 first:mt-0 mb-1.5 text-foreground">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h5>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground/95">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-foreground/95 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-foreground/95 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  hr: () => <hr className="my-3 border-border/70" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic text-[13px]">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-90"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code
          className="rounded bg-muted/80 px-1 py-0.5 text-[12px] font-mono text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn("block rounded-md bg-muted/50 p-2 text-[12px] font-mono overflow-x-auto my-2", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-[12px]">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-md border border-border/60">
      <table className="w-full text-left text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1.5 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-2 py-1.5 align-top text-foreground/95">{children}</td>
  ),
};

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn("chat-markdown break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
