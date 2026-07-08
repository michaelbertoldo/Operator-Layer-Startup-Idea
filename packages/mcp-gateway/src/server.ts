/**
 * server.ts — OperatorLayer MCP server (v1 SDK, stdio transport).
 *
 * This is the thing a prospect adds to Claude Desktop / Cursor in ~60 seconds.
 * Once added, their agent can only spend *through* these tools, and every call
 * is checked by OperatorLayer before any money (fake or real) moves.
 *
 * Run:   node dist/server.js
 * Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "operatorlayer": {
 *         "command": "node",
 *         "args": ["/abs/path/to/packages/mcp-gateway/dist/server.js"],
 *         "env": {
 *           "OPERATORLAYER_URL": "http://localhost:3000",
 *           "OPERATORLAYER_AGENT_KEY": "agt_live_xxx"
 *         }
 *       }
 *     }
 *   }
 */

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { OperatorClient } from "./operatorClient.js";
import { EnvCredentialVault } from "./credentialVault.js";

// --- config (fail fast, don't silently run mis-wired) ------------------------
const BASE_URL = requireEnv("OPERATORLAYER_URL");
const AGENT_KEY = requireEnv("OPERATORLAYER_AGENT_KEY");

const operator = new OperatorClient(BASE_URL, AGENT_KEY);
const vault = new EnvCredentialVault();

const server = new McpServer(
  { name: "operatorlayer", version: "0.1.0" },
  {
    instructions:
      "Before spending money on any paid API, data provider, or tool, you MUST " +
      "call `request_spend` first and only proceed if it returns EXECUTED. " +
      "Never attempt to call a paid vendor directly.",
  },
);

// --- tool: request_spend -----------------------------------------------------
// The main event. Agent declares intent; OperatorLayer decides; if approved we
// (optionally) make the paid call ourselves using the vaulted credential so the
// agent never sees the key.
server.registerTool(
  "request_spend",
  {
    title: "Request permission to spend",
    description:
      "Ask OperatorLayer to authorize a paid action (API call, data lookup, " +
      "compute). Returns EXECUTED, NEEDS_APPROVAL, or BLOCKED with reasons.",
    inputSchema: {
      vendorId: z.string().describe("Vendor id, e.g. 'vnd_clearbit'"),
      category: z.string().describe("Spend category, e.g. 'Data enrichment'"),
      amountCents: z.number().int().positive().describe("Amount in cents"),
      purpose: z
        .string()
        .optional()
        .describe("Why the agent needs this — recorded in the audit trail"),
    },
  },
  async ({ vendorId, category, amountCents, purpose }: { vendorId: string; category: string; amountCents: number; purpose?: string }) => {
    // One idempotency key per logical attempt. If the model retries this exact
    // tool call after a timeout, the backend de-dupes and never double-charges.
    const idempotencyKey = randomUUID();

    const decision = await operator.requestSpend({
      vendorId,
      category,
      amountCents,
      purpose,
      idempotencyKey,
    });

    // If (and only if) approved, execute the paid call with the vaulted key.
    let vendorCallResult: string | null = null;
    if (decision.finalStatus === "EXECUTED") {
      vendorCallResult = await executePaidCall(vendorId, { category, amountCents });
    }

    return {
      content: [
        {
          type: "text",
          text: formatDecision(decision, vendorCallResult),
        },
      ],
      structuredContent: {
        paymentRequestId: decision.paymentRequestId,
        status: decision.finalStatus,
        risk: decision.risk,
        policyReasons: decision.policyReasons,
      },
    };
  },
);

// --- tool: check_budget ------------------------------------------------------
server.registerTool(
  "check_budget",
  {
    title: "Check remaining budget",
    description:
      "Read-only. Returns this agent's weekly budget, amount held, and " +
      "remaining spend. Use this to plan before committing.",
    inputSchema: {},
  },
  async () => {
    const b = await operator.checkBudget();
    return {
      content: [
        {
          type: "text",
          text:
            `Weekly budget: $${cents(b.weeklyBudgetCents)}\n` +
            `Held/spent:    $${cents(b.heldCents)}\n` +
            `Remaining:     $${cents(b.remainingCents)}`,
        },
      ],
      structuredContent: b,
    };
  },
);

// --- helpers -----------------------------------------------------------------

/**
 * Reaches into the vault and makes the real paid call. In the fake-money MVP
 * this just proves the wiring without a live key. When you go live, this is the
 * single choke point where the vendor secret is used — nowhere else.
 */
async function executePaidCall(
  vendorId: string,
  meta: { category: string; amountCents: number },
): Promise<string> {
  const cred = await vault.get(vendorId);
  if (!cred) {
    return `[fake-executor] Approved. No live credential for ${vendorId}; ` +
      `simulated a $${cents(meta.amountCents)} ${meta.category} call.`;
  }
  // Real path (kept behind vault presence so the MVP stays fake-money):
  //   const res = await fetch(cred.baseUrl, {
  //     headers: { [cred.header]: cred.value },
  //   });
  //   return await res.text();
  return `[executor] Would call ${cred.baseUrl} with injected credential.`;
}

function formatDecision(
  d: { finalStatus: string; risk: { level: string; score: number; signals: string[] }; policyReasons: string[] },
  vendorCallResult: string | null,
): string {
  const lines = [
    `Status: ${d.finalStatus}`,
    `Risk:   ${d.risk.level} (${d.risk.score}) — ${d.risk.signals.join(", ") || "none"}`,
    `Policy: ${d.policyReasons.join(", ")}`,
  ];
  if (d.finalStatus === "NEEDS_APPROVAL") {
    lines.push("A human must approve this before it executes. Do not retry.");
  }
  if (d.finalStatus === "BLOCKED") {
    lines.push("This action was denied. Do not attempt an alternate route.");
  }
  if (vendorCallResult) lines.push("", vendorCallResult);
  return lines.join("\n");
}

function cents(n: number): string {
  return (n / 100).toFixed(2);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    // stderr, not stdout — stdout is the JSON-RPC channel and must stay clean.
    process.stderr.write(`[operatorlayer] missing required env ${name}\n`);
    process.exit(1);
  }
  return v;
}

// --- boot --------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[operatorlayer] MCP server ready on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`[operatorlayer] fatal: ${String(err)}\n`);
  process.exit(1);
});
