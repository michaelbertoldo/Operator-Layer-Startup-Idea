"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ControlsClientProps = {
  scope: "company" | "agent";
  agentId?: string;
  frozen: boolean;
  reason?: string | null;
  compact?: boolean;
};

const demoControlApiKey = "key_research";

export function ControlsClient({
  scope,
  agentId,
  frozen,
  reason,
  compact = false
}: ControlsClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const action = frozen ? "unfreeze" : "freeze";

  async function submitControl() {
    setError(null);

    const response = await fetch("/api/controls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${demoControlApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scope,
        action,
        agentId,
        reason:
          action === "freeze"
            ? scope === "company"
              ? "Manual company kill switch from dashboard."
              : "Manual agent freeze from dashboard."
            : "Manual unfreeze from dashboard."
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error ?? "Control action failed.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && frozen && reason ? (
        <p className="text-sm font-medium text-red-700">{reason}</p>
      ) : null}
      <Button
        type="button"
        variant={frozen ? "secondary" : "danger"}
        disabled={isPending}
        onClick={() => void submitControl()}
      >
        {isPending
          ? "Updating"
          : frozen
            ? scope === "company"
              ? "Unfreeze all spend"
              : "Unfreeze agent"
            : scope === "company"
              ? "Freeze all spend"
              : "Freeze agent"}
      </Button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
