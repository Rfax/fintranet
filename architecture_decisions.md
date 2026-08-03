# Fintranet Prototype Architecture Decisions

## Prototype Scope
While it is known the client uses Microsoft Power Apps for some internal tooling, it's unclear how deep the integration actually goes. Power Apps could be functioning primarily as an interface over existing systems, or the client could also rely on it for data storage, workflow automation, permissions, integrations, and auditing. Without access to those implementation details, attempting to reproduce the full platform would have required too many arbitrary assumptions and would not have produced a meaningful comparison.

The initial prototype therefore focuses on the **interaction layer only**. Its purpose is to showcase the value of purpose-built interfaces: presenting the right context for each decision, adapting the information hierarchy to the task, and combining operational and engineering data in ways that a generic internal-tool surface may not.

### Prototype Implementation
Because this prototype is intended to evaluate the interaction surface, all underlying data and business behavior are mocked for the demo. Synthetic records represent the KYC cases, refunds, users, and feature flags that the interface needs, while actions update local demo state only. No backend, real identity, production integrations, governance, or compliance capabilities are implemented or claimed. The resulting interface could later be connected to Microsoft Power Apps, another third-party platform, or an in-house business layer.

## Feature Highlights

### KYC Review Queue
Each of the KYC cases are organized around the specific areas that require attention rather than a fixed, equally weighted layout.

- **Workload overview:** Shows open and overdue cases, intake versus completion, review-time trends, and backlog by risk and SLA.
- **Adaptive case detail:** Changes the primary evidence panel based on the leading signal, such as a sanctions match, document inconsistency, or address-verification failure.
- **Progressive investigation:** Starts with the customer’s financial picture, then allows profile, activity, documents, relationships, and secondary evidence to be expanded as needed.
- **Review workflow:** Supports assignment, notes, approve/reject/request-information decisions, next-case navigation, and case activity history.

### Refunds Dashboard
Refund review brings the surrounding behavioral context into the same screen as the request.

- **Operations dashboard:** Summarizes refund volume, reasons, amounts, risk, and queue status.
- **Contextual detail:** Shows customer refund behavior, item and merchant patterns, payment information, and related attempts beside the decision.
- **High-value controls:** Requires two distinct approvers before a high-value refund can proceed.
- **Exception handling:** Supports rejection, escalation, processor retry, internal notes, required reasons, and activity history.

### Feature Flag Admin Panel
Feature-flag administration combines configuration, debugging, and source-code context instead of treating a flag as simply on or off.

- **Flag inventory and detail:** Shows environment-specific state, rollout percentage, targeting rules, personal overrides, ownership, and supporting resources.
- **Effective-value debugger:** Resolves all flags for a supplied user and explains whether each result came from environment state, a targeting rule, rollout bucket, or personal override.
- **Code usage:** Displays the exact repository, file, line, and code snippet where a flag is used, including test coverage and cleanup signals.
- **Developer handoff:** Allows the user to directly jump into the file that uses this flag in their preferred environment.
- **Change guardrails:** Previews audience impact and provides before/after diffs, production confirmations, required reasons, rollback, and activity history.
