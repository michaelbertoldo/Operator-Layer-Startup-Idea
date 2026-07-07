import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CredentialVault } from "./credentialVault";
import {
  OperatorLayerClient,
  type GatewayOptions,
  type GatewayRequest
} from "./operatorClient";

export type McpGatewayServerOptions = GatewayOptions & {
  port?: number;
  client?: OperatorLayerClient;
  credentialVault?: CredentialVault;
};

export function createMcpGatewayServer(options: McpGatewayServerOptions = {}) {
  const client =
    options.client ??
    new OperatorLayerClient({
      baseUrl: options.baseUrl,
      credentialVault: options.credentialVault,
      fetcher: options.fetcher
    });

  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, client);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "MCP gateway request failed."
      });
    }
  });
}

export async function startMcpGatewayServer(options: McpGatewayServerOptions = {}) {
  const port = options.port ?? 8787;
  const server = createMcpGatewayServer(options);

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  return { server, port };
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  client: OperatorLayerClient
) {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/request-paid-api-call") {
    const body = await readJsonBody<GatewayRequest & { idempotencyKey?: string }>(request);
    const result = await client.requestPaidApiCall(body, {
      idempotencyKey: body.idempotencyKey
    });

    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname === "/remaining-budget") {
    const agentId = url.searchParams.get("agentId");

    if (!agentId) {
      sendJson(response, 400, { error: "agentId is required." });
      return;
    }

    const result = await client.checkRemainingBudget(agentId);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/request-human-approval") {
    const body = await readJsonBody<{ requestId?: string }>(request);

    if (!body.requestId) {
      sendJson(response, 400, { error: "requestId is required." });
      return;
    }

    const result = await client.requestHumanApproval(body.requestId);
    sendJson(response, 200, result);
    return;
  }

  sendJson(response, 404, { error: "Route not found." });
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body));
}
