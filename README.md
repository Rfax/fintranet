# Fintranet — Operations Console

Fintranet is an internal operations console covering three workflows that today live in
separate Microsoft Power Apps: **KYC review**, **refund operations**, and **feature-flag
administration**.

The product idea it demonstrates is **attention-aware presentation**: a record is not rendered as a
generic form with every field weighted equally. Each case, refund, or flag is presented around the
thing that actually needs a decision, with the complete underlying record still one click away.

> **Boundaries**
>
> - Records come from TypeScript fixtures served through the service layer; no production system is
>   connected. Actions mutate local state only.
> - The signed-in user is fixed and there is no identity provider wired in.
> - This is the **application layer** only — not a replacement for Dataverse, Power Automate,
>   identity, governance, or compliance infrastructure. The activity history is an operational
>   timeline, not a tamper-resistant audit log.

`PROTOTYPE_FEATURES.md` is the source of truth for the product vision and feature set.

## Setup

Requires Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
```

## Run

```bash
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # type-check and produce a production build in dist/
npm run preview    # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc -b
npm test           # Vitest (logic tests)
```

## Architecture

```text
src/
  components/
    ui/        shadcn/ui primitives (composed, not used as the final design)
    shared/    shell, page chrome, and cross-module compositions
    kyc/ refunds/ flags/   module-specific presentation pieces
  pages/       one component per route
  data/        fixture records served through the service layer
  services/    promise-based service layer over the fixtures
  logic/       pure domain logic (focus selection, formatting) with Vitest coverage
  types/       domain models
  hooks/       session context, async data loading, media queries
```

**Service layer.** Pages never import fixtures directly. `src/services/*` exposes async functions
(`listKycCases`, `approveRefund`, `updateEnvironmentConfig`, …) behind a small latency, so loading
and error states are real and the fixture implementation can later be swapped for internal APIs
without touching the interface. Mutations are written back through `src/services/store.ts`, so
decisions, refund approvals, and flag configuration survive a reload. `localStorage` also holds
queue filters, the selected flag environment, and sidebar state.

**Attention-aware presentation.** `src/logic/focus.ts` ranks the signals attached to a record
(severity, then confidence, then detection time) and returns both the primary signal and a
human-readable explanation of why it ranked first. The same deterministic logic drives the review
focus column in every queue and the emphasised panel on every detail view, so presentation stays
explainable and never changes the underlying record.

**Flag evaluation.** `src/logic/flagEvaluation.ts` resolves a flag for a user in one place —
environment default, global state, targeting rules, percentage rollout, then personal override — and
both the flag detail page and the effective-flag debugger render that same trace, so an effective
value shown anywhere in the console is produced identically.

**Routes.** All routes render inside the shared shell (collapsible navigation, top bar, breadcrumbs):

| Route | View |
| --- | --- |
| `/` | Redirects to `/kyc` |
| `/kyc` | KYC workload overview and review queue |
| `/kyc/:caseId` | Adaptive KYC case detail |
| `/refunds` | Refund dashboard and queue |
| `/refunds/:refundId` | Refund detail with customer and item context |
| `/flags` | Feature-flag inventory |
| `/flags/debugger` | Effective-flag debugger by user |
| `/flags/my-flags` | Flags owned by the signed-in user |
| `/flags/:flagKey` | Feature-flag detail with code references |
| `/activity` | Shared activity history |

## Stack

React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, Lucide, Recharts, Vitest.
No backend, database, authentication provider, or container runtime.
