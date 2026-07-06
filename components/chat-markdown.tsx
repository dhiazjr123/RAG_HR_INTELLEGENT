"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

function CitationLink({ href, title, children }: { href: string; title?: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const parts = title ? title.split("|") : [];
  const filename = parts[0] || "Sumber CV";
  const snippet = parts[1] || "";

  const openPopover = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      let left = rect.left + rect.width / 2;
      
      const minLeft = popoverWidth / 2 + 12;
      const maxLeft = window.innerWidth - (popoverWidth / 2) - 12;
      left = Math.max(minLeft, Math.min(maxLeft, left));

      setPopoverPos({
        top: rect.top - 8,
        left: left,
      });
    }
    setIsOpen(true);
  };

  const closePopoverWithDelay = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleMouseEnterBadge = () => {
    openPopover();
  };

  const handleMouseLeaveBadge = () => {
    closePopoverWithDelay();
  };

  const handleMouseEnterPopover = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeavePopover = () => {
    closePopoverWithDelay();
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-block mx-0.5 align-baseline"
      onMouseEnter={handleMouseEnterBadge}
      onMouseLeave={handleMouseLeaveBadge}
    >
      <span className="inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-zinc-100 bg-zinc-700 hover:bg-zinc-600 rounded-full cursor-help shadow-sm border border-zinc-600 transition-colors">
        {children}
      </span>
      {isOpen && mounted && createPortal(
        <span
          className="fixed z-[9999] block w-[280px] p-3 text-left rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl text-[12px] leading-relaxed transition-opacity pointer-events-auto transform -translate-x-1/2 -translate-y-full"
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
          }}
          onMouseEnter={handleMouseEnterPopover}
          onMouseLeave={handleMouseLeavePopover}
        >
          <span className="block font-semibold text-zinc-300 border-b border-zinc-800 pb-1.5 mb-1.5 truncate">
            📄 {filename}
          </span>
          <span className="block font-mono text-zinc-400 max-h-[160px] overflow-y-auto whitespace-pre-wrap">
            {snippet || "Kutipan bukti dari CV."}
          </span>
        </span>,
        document.body
      )}
    </span>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h3 className="text-base font-semibold mt-4 first:mt-0 mb-2 text-foreground border-b border-border/60 pb-1">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="text-sm font-semibold mt-4 first:mt-0 mb-2 pt-2 border-t border-border/50 text-foreground">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="text-sm font-semibold mt-3 mb-1.5 text-foreground rounded-md bg-muted/35 border border-border/50 px-2.5 py-1.5">
      {children}
    </h5>
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
  a: ({ href, children, title }) => {
    if (href?.startsWith("#citation-")) {
      return <CitationLink href={href} title={title}>{children}</CitationLink>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-90"
      >
        {children}
      </a>
    );
  },
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
