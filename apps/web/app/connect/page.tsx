import { ConnectClient } from "./connect-client";

export default async function ConnectPage() {
  // Demo: show Railway and Anthropic provisioning options
  // In production, this would list vendors that need credentials
  const providers = [
    {
      provider: "railway",
      vendorId: "vnd_railway",
      vendorName: "Railway",
      instructions:
        "Railway supports CLI-based device auth. Click 'Provision Credential' to start the authentication flow. The CLI will open a browser for authentication, then securely store the token.",
      scopes: ["read:projects", "write:projects"],
    },
    {
      provider: "anthropic",
      vendorId: "vnd_anthropic",
      vendorName: "Anthropic",
      instructions:
        "Anthropic API keys must be created manually at console.anthropic.com/settings/keys. This flow is currently stubbed - full implementation requires a secure manual input channel.",
      scopes: [],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">OperatorLayer Connect</h1>
        <p className="mt-2 text-gray-600">
          Securely provision third-party API credentials through guided flows.
          The AI agent never sees the raw token value.
        </p>
      </div>

      <div className="space-y-6">
        {providers.map((p) => (
          <ConnectClient key={p.provider} {...p} />
        ))}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
        <p className="font-semibold text-blue-900">How it works:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-blue-800">
          <li>
            AI proposes what credentials are needed (provider, scopes, env var
            name)
          </li>
          <li>Human reviews and approves the provisioning request</li>
          <li>
            For CLI-supported providers: credential is captured through device
            auth
          </li>
          <li>
            Token is encrypted and stored in OperatorLayer's vault (database)
          </li>
          <li>
            AI receives API results when calling vendors, never the raw token
          </li>
        </ol>
      </div>
    </div>
  );
}
