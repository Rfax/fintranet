# Fintranet — Operations Console (prototype)

Fintranet is a prototype internal operations console covering three workflows that today live in
separate Microsoft Power Apps: **KYC review**, **refund operations**, and **feature-flag
administration**.

The product idea it demonstrates is **attention-aware presentation**: a record is not rendered as a
generic form with every field weighted equally. Each case, refund, or flag is presented around the
thing that actually needs a decision, with the complete underlying record still one click away.

> **Prototype boundaries**
>
> - All data is synthetic TypeScript fixtures. No customer, payment, repository, or flag data is real.
> - Authentication and authorization are simulated. The signed-in user, role switcher, and
>   environment switcher are UI state, not access control.
> - Actions never affect real customers, payments, repositories, or feature flags.
> - This demonstrates the **application layer** only. It is not a production replacement for
>   Dataverse, Power Automate, identity, governance, or compliance infrastructure. The activity
>   history is a prototype timeline, not a tamper-resistant audit log.

`PROTOTYPE_FEATURES.md` is the source of truth for the product vision and planned feature set.

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
  data/        synthetic fixtures
  services/    promise-based service layer over the fixtures
  logic/       pure domain logic (focus selection, formatting) with Vitest coverage
  types/       domain models
  hooks/       session context, async data loading, media queries
```

**Service layer.** Pages never import fixtures directly. `src/services/*` exposes async functions
(`listKycCases`, `getRefund`, `listFlags`, …) that clone fixture data behind a small simulated
latency, so loading and error states are real and the mock implementation can later be swapped for
internal APIs without touching the interface. `localStorage` is used only where persistence is
genuinely useful: simulated role, simulated environment, sidebar state, and activity recorded
during a session.

**Attention-aware presentation.** `src/logic/focus.ts` ranks the signals attached to a record
(severity, then confidence, then detection time) and returns both the primary signal and a
human-readable explanation of why it ranked first. The same deterministic logic drives the review
focus column in every queue and the emphasised panel on every detail view, so presentation stays
explainable and never changes the underlying record.

**Session simulation.** `SessionProvider` holds the mock signed-in user, simulated role
(viewer / operator / admin), and simulated environment (development / staging / production).
`can()` in `sessionService` gates UI affordances only; there is no real authorization.

**Routes.** All routes render inside the shared shell (collapsible navigation, top bar, breadcrumbs):

| Route | View |
| --- | --- |
| `/` | Redirects to `/kyc` |
| `/kyc` | KYC workload overview and review queue |
| `/kyc/:caseId` | Adaptive KYC case detail |
| `/refunds` | Refund dashboard and queue |
| `/refunds/:refundId` | Refund detail with customer and item context |
| `/flags` | Feature-flag dashboard |
| `/flags/debugger` | Effective-flag debugger by user |
| `/flags/:flagKey` | Feature-flag detail with code references |
| `/activity` | Shared activity history |

## Current state

This is the scaffolding slice: the shell, design language, types, fixtures, service layer, and
focus-selection logic are in place, and every route renders real synthetic data. Views that are not
yet built out end with a "Planned for this view" panel listing what the feature slice will add.

## Stack

React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, Lucide, Recharts, Vitest.
No backend, database, authentication provider, or container runtime.
