# OperatorLayer Lite

OperatorLayer Lite is a fake-money MVP for AI agent spend controls. It gives agents controlled budgets, vendor rules, policy checks, risk scoring, approval workflows, and audit logs before simulated spend is authorized.

Phase 1 uses a fake payment executor only. It does not connect to real wallets, store private keys, or move real funds.

## Workspace

This repo uses a pnpm monorepo:

```text
operatorlayer/
  apps/
    web/
  packages/
    core/
    mcp-gateway/
  docs/
```

## Packages

- `apps/web`: Next.js TypeScript app.
- `packages/core`: Shared policy, risk, schema, fake payment, and audit utilities.
- `packages/mcp-gateway`: Mock MCP/API gateway helpers.
- `docs`: Product plan, build plan, and milestone prompts.

## Setup

Install dependencies:

```bash
corepack pnpm install
```

Run the web app:

```bash
corepack pnpm dev
```

Set up the local SQLite database:

```bash
corepack pnpm db:push
corepack pnpm db:seed
```

Run checks:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Development Notes

- Keep business logic in `packages/core`, not React components.
- Use fake payments only during phase 1.
- Add tests for policy and risk behavior as those modules are implemented.
- Follow `AGENTS.md` and the milestone sequence in `docs/codex-prompts.md`.
# PeaksVC
