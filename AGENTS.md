# AGENTS.md

## Project

This project is called OperatorLayer Lite.

OperatorLayer Lite is a fake-money MVP for agent spend controls. It lets companies create AI agents with budgets, approved vendors, policy rules, risk checks, approval workflows, and audit logs.

The core workflow is:

1. An AI agent requests permission to spend.
2. The policy engine checks the agent, vendor, category, amount, budget, and tool rules.
3. The risk engine scores the request.
4. The request is auto-approved, blocked, or routed for human approval.
5. The system writes an audit event.
6. The dashboard shows spend, approvals, and logs.

## Critical constraints

- Do not implement real-money mainnet payments in phase 1.
- Do not connect to real wallets in phase 1.
- Do not store private keys.
- Do not move real funds.
- Do not implement ACH, cards, lending, yield, fiat conversion, or custody.
- All payments in phase 1 must use a fake payment executor.
- Use language like controlled spend, policy, authorization, non-custodial, audit logs, risk checks, and agent permissions.
- Avoid language like bank account, deposit, checking, savings, custody, yield, investment, borrowing, and cash management.

## Stack

Use:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- Postgres or SQLite for local development
- Zod
- Vitest

## Architecture

Use a monorepo:

operatorlayer/
  apps/
    web/
  packages/
    core/
    mcp-gateway/
  docs/

The core business logic should live in packages/core, not inside React components.

## Core packages

packages/core should contain:

- policy engine
- risk engine
- fake payment executor
- schemas
- audit utilities

packages/mcp-gateway should contain:

- mock MCP/API gateway functions
- requestPaidApiCall
- checkRemainingBudget
- requestHumanApproval

## Code standards

- Use TypeScript strict mode.
- Use Zod schemas for API inputs.
- Keep business logic out of React components.
- Write unit tests for policy and risk logic.
- Every payment request must create audit logs.
- Prefer small, focused changes over large rewrites.
- After each implementation, run tests or explain why tests could not be run.

## Done means

A feature is done only when:

- It works locally.
- TypeScript passes.
- Tests are added or updated where appropriate.
- The UI handles loading, empty, and error states.
- The audit trail reflects the action.

This file is your “memory” for Codex. It keeps Codex from accidentally building the wrong thing.
