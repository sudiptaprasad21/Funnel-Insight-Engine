# Nexpoint Funnel IQ

AI-assisted marketing funnel drop-off diagnosis tool with a trackable Happy Mom demo e-commerce store, built for growth managers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/nexpoint-funnel-iq run dev` — run the frontend (port 23139, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Express session secret
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI proxy for OpenAI

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, shadcn/ui, recharts, framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- AI: OpenAI gpt-5.2 via Replit AI Integrations proxy (`lib/integrations-openai-ai-server`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema files (events, customers, products, reviews, experiments)
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not edit)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/nexpoint-funnel-iq/src/pages/` — React pages (landing, dashboard, customers, products)
- `artifacts/nexpoint-funnel-iq/src/lib/tracking.ts` — event tracking utility for the demo store

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives all type generation via Orval. Never hand-write API types.
- **Analytics are computed**: All funnel metrics are derived from the `funnel_events` table at query time, with sensible floor values so the dashboard always shows data.
- **Landing page tracks real events**: Every user interaction on the Happy Mom demo store fires `POST /api/events`, generating real funnel data visible in the dashboard.
- **AI diagnosis returns and persists experiments**: The `/api/ai/diagnose` endpoint calls OpenAI, then saves generated experiment suggestions to the `experiments` table. Falls back gracefully if the AI call fails.
- **bannerCTR / conversionRate / repeatCustomerRate are decimals (0–1)** in the API response; the frontend multiplies by 100 to display percentages.

## Product

- **Happy Mom Demo Store** (`/`): A Mother's Day campaign landing page that tracks every interaction (page views, banner clicks, product views, add-to-cart, checkout, subscription clicks) via the events API.
- **Funnel IQ Console** (`/dashboard`): Real-time funnel metrics, drop-off stage analysis, and an AI Diagnostician that generates insights and A/B experiment ideas on demand.
- **Customers** (`/customers`): Customer list with subscription/repeat buyer status, monthly trend chart, and subscription health metrics.
- **Products** (`/products`): Campaign catalogue with sale pricing, discount percentages, and nappy subscription flags.

## User preferences

- Use INR (₹) for prices on the frontend (products use real prices from the DB).
- Mother's Day 2026 date: May 10th.

## Gotchas

- After changing any route file, restart the `artifacts/api-server: API Server` workflow — the server builds to `dist/` on startup.
- After changing `lib/db/src/schema/`, run `pnpm --filter @workspace/db run push` to apply migrations.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks and Zod schemas.
- `reviews.customerId` and `reviews.productId` are nullable in the DB schema (despite the OpenAPI spec requiring them for the POST body).
- Do not run `pnpm dev` at the workspace root — use the workflow system.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
