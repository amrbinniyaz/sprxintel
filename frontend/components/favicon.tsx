"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

export function Favicon({
  domain,
  size = "sm",
  className,
}: {
  domain: string | null | undefined;
  size?: Size;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const px = size === "md" ? 24 : 20;
  const fetchSize = size === "md" ? 64 : 64;
  const box = cn(
    "shrink-0 rounded-sm ring-1 ring-border",
    size === "md" ? "h-6 w-6" : "h-5 w-5",
    className,
  );

  if (errored || !domain) {
    return (
      <div className={cn(box, "grid place-items-center bg-[var(--card-2)] text-muted-foreground")}>
        <Globe size={size === "md" ? 13 : 11} />
      </div>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${fetchSize}`}
      alt=""
      width={px}
      height={px}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn(box, "bg-white object-contain")}
    />
  );
}
