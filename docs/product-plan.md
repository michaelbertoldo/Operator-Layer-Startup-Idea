# OperatorLayer Lite Product Plan

## One-liner

OperatorLayer is the spend-control layer for AI agents.

It lets companies give AI agents budgets, vendor rules, approval flows, and audit trails before the agent can spend money.

## Product thesis

AI agents are becoming digital workers. They will call paid APIs, buy data, access MCP tools, purchase compute, and complete business workflows.

The problem is that companies cannot safely give agents unlimited access to money.

OperatorLayer gives every AI agent:

- budget
- identity
- approved vendors
- approved tools
- transaction limits
- weekly/monthly limits
- approval thresholds
- risk checks
- audit trails

## Initial wedge

The MVP wedge is:

Agent Spend Firewall for MCP/API usage.

Target customers:

- AI agent startups
- developer tool companies
- API marketplaces
- data providers
- research automation teams
- companies using AI agents internally

Pain:

"My agent needs to call paid tools, but I cannot give it my wallet, card, or unlimited spend."

Answer:

"Create a controlled agent budget. Every paid API or MCP call is checked against policy before money moves."

## Phase 1 MVP

Build a fake-money MVP.

The UX, dashboard, policy engine, risk engine, approval workflow, and audit trail are real.

The payment executor is fake.

No real money moves.

## Main user flow

1. Company creates an agent.
2. Company sets budget and approved vendors.
3. Agent requests a paid API call.
4. OperatorLayer checks the policy.
5. OperatorLayer checks risk.
6. If safe, fake payment is executed.
7. If medium risk, request goes to approval.
8. If high risk, request is blocked.
9. Audit log records every step.

## Demo scenarios

Safe request:

- approved vendor
- small amount
- allowed category
- low risk
- result: executed

New vendor request:

- pending vendor
- medium amount
- allowed category
- medium risk
- result: needs approval

Dangerous request:

- unknown or blocked vendor
- high amount
- disallowed category
- high risk
- result: blocked

## Product positioning

Use:

- spend controls for AI agents
- policy layer
- agent authorization
- MCP/API spend firewall
- audit logs
- risk checks
- non-custodial controls

Avoid:

- AI bank account
- deposits
- checking
- savings
- custody
- yield
- lending
- investment
- money transmission
