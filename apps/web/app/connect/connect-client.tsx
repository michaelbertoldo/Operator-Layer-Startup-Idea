"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ConnectClientProps = {
  provider: string;
  vendorId: string;
  vendorName: string;
  instructions: string;
  scopes?: string[];
};

const demoAgentApiKey = "key_research";

export function ConnectClient({
  provider,
  vendorId,
  vendorName,
  instructions,
  scopes = [],
}: ConnectClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function provisionCredential() {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/connect/provision", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${demoAgentApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider,
        vendorId,
        scopes,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error ?? "Provisioning failed.");
      return;
    }

    setSuccess(
      `✓ Credential provisioned successfully. Environment variable: ${payload.envVarName}`,
    );

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div>
        <h3 className="text-lg font-semibold">Provision {provider}</h3>
        <p className="text-sm text-gray-600">Vendor: {vendorName}</p>
      </div>

      <div className="rounded bg-gray-50 p-4 text-sm">
        <p className="font-medium">Instructions:</p>
        <p className="mt-1 text-gray-700">{instructions}</p>
      </div>

      {scopes.length > 0 && (
        <div>
          <p className="text-sm font-medium">Requested scopes:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
            {scopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => void provisionCredential()}
        >
          {isPending ? "Provisioning..." : "Provision Credential"}
        </Button>

        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        {success && <p className="text-sm font-medium text-green-700">{success}</p>}
      </div>

      <div className="rounded bg-yellow-50 p-3 text-sm">
        <p className="font-medium text-yellow-900">Security Note:</p>
        <p className="text-yellow-800">
          The credential will be encrypted and stored securely. The AI agent will
          never see the raw token value.
        </p>
      </div>
    </div>
  );
}
