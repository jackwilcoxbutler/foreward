"use client";

import { useState } from "react";
import { Check, Copy, Link as LinkIcon, Share2 } from "lucide-react";
import { buildShareMessage } from "@/lib/golf";
import type { RoundRecord } from "@/lib/types";

type CopiedState = "message" | "link" | null;

export function ShareActions({ round }: { round: RoundRecord }) {
  const [copied, setCopied] = useState<CopiedState>(null);

  function publicUrl() {
    return typeof window === "undefined" ? `/r/${round.shareId}` : window.location.href;
  }

  async function copy(value: string, type: CopiedState) {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function shareRound() {
    const url = publicUrl();
    const text = buildShareMessage(round, url);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${round.courseName} — ${round.totalScore}`, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(text, "message");
  }

  return (
    <div className="share-actions">
      <button className="button button-primary button-large button-full" type="button" onClick={shareRound}>
        <Share2 size={19} /> Share round
      </button>
      <div className="share-secondary-actions">
        <button type="button" onClick={() => copy(buildShareMessage(round, publicUrl()), "message")}>
          {copied === "message" ? <Check size={17} /> : <Copy size={17} />}
          {copied === "message" ? "Copied" : "Copy message"}
        </button>
        <button type="button" onClick={() => copy(publicUrl(), "link")}>
          {copied === "link" ? <Check size={17} /> : <LinkIcon size={17} />}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
