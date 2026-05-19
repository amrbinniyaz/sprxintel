"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Source = {
  title: string;
  url: string;
  type: "Page" | "PDF" | "Doc";
  score: string;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  bullets?: string[];
  sources?: Source[];
};

const SOURCES: Source[] = [
  {
    title: "Admissions - Visit Ursuline",
    url: "https://www.ursulinedallas.org/admissions/visit",
    type: "Page",
    score: "0.91",
  },
  {
    title: "Tuition and Financial Assistance",
    url: "https://www.ursulinedallas.org/admissions/tuition",
    type: "Page",
    score: "0.87",
  },
  {
    title: "Academics Program Overview",
    url: "https://www.ursulinedallas.org/academics",
    type: "Page",
    score: "0.84",
  },
];

const STARTERS = [
  "Which schools added a Sixth Form Centre in the last 12 months?",
  "Show me all schools using Blackbaud with no SEND page",
  "Find 20 schools similar to Eton College",
  "What's the average page count for US prep schools?",
];

const BASE_ANSWER = [
  "The admissions path is strongest around visit intent, but the handoff from program exploration to inquiry is uneven.",
  "Tuition and financial assistance content appears findable, yet it is isolated from several high-intent pages.",
  "Academic pages carry strong proof points but need clearer next-step calls to action for prospective families.",
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const empty = messages.length === 0;

  useEffect(() => {
    if (!empty) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, empty]);

  function ask(question?: string) {
    const q = (question || input).trim();
    if (!q) return;
    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: q,
      },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Here is the prototype response the live LLM layer would produce from the crawled pages and documents.",
        bullets: BASE_ANSWER,
        sources: SOURCES,
      },
    ]);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[760px] flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-2)] text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_22px_-8px_rgba(99,102,241,0.45)]">
            <Sparkles size={24} strokeWidth={2.2} />
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Ask SprXintel
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Natural language queries across the crawled school corpus.
            </p>
          </div>

          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => ask()}
            className="w-full"
          />

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {STARTERS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => ask(prompt)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm text-foreground shadow-[var(--shadow-xs)] transition hover:border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] hover:bg-[var(--surface-hover)]"
              >
                <MessageSquare
                  size={15}
                  className="mt-0.5 shrink-0 text-primary"
                />
                <span className="leading-relaxed">{prompt}</span>
              </button>
            ))}
          </div>

          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground shadow-[var(--shadow-xs)]">
            <Sparkles size={11} className="text-primary" />
            Powered by retrieval over crawled pages
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-6 py-8">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="sticky bottom-6 pb-2">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => ask()}
              className="bg-card/95 backdrop-blur"
            />
          </div>
        </>
      )}
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={1}
        placeholder="Ask anything about the school market..."
        className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim()}
        className="h-10 w-10 shrink-0 px-0"
        aria-label="Send message"
      >
        <ArrowUp size={16} />
      </Button>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl bg-gradient-to-br from-primary to-[var(--primary-2)] px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-[0_10px_24px_-16px_rgba(99,102,241,0.75)]">
          {message.content}
        </div>
      </div>
    );
  }

  const sources = message.sources ?? [];

  return (
    <div className="text-sm leading-relaxed text-foreground">
      <p>{message.content}</p>
      {message.bullets && (
        <ul className="mt-3 space-y-2.5">
          {message.bullets.map((bullet, i) => {
            const source = sources[i % Math.max(sources.length, 1)];
            return (
              <li key={bullet} className="flex gap-2">
                <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                <span>
                  {bullet}
                  {source && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      title={source.title}
                      className="ml-1 inline-flex items-center gap-0.5 align-baseline text-[11px] font-medium text-primary transition hover:underline"
                    >
                      [{i + 1}]
                      <ExternalLink size={9} className="opacity-70" />
                    </a>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
