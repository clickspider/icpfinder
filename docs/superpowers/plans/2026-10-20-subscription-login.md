# Subscription Login Implementation Plan

**Goal:** Local desktop sign-in and AI execution using Claude, ChatGPT/Codex, or xAI subscriptions.
**Architecture:** Main-process account service, provider adapters, typed IPC, shared subscription panel and provider-aware research/browser execution.
**Tech Stack:** Electron, TypeScript, React, official Claude/Codex CLIs, xAI OAuth and Responses API.

- [x] Account service (`main/subscription-auth.ts`, `main/cli.ts`, `shared/subscriptions.ts`): check CLI auth, launch/cancel official browser login, device-code xAI login, refresh serialization, encrypted atomic storage. Test failures, cancellation, refresh and status using injected dependencies.
- [x] Runtime (`main/subscription-provider.ts`, engine/agent integration): clean subprocess environment; Codex JSONL response/usage; xAI responses and grounding; selected provider throughout execution; no silent Claude fallback. Test fixture replies, failures and routing.
- [x] Product (`SubscriptionPanel.tsx`, preload/types/index/App/Connectors/ui): expose only account metadata, onboarding access, provider/model selection, cancel and errors; migrate settings and label usage honestly.
- [x] Verification: `bun install`, workspace tests/types/build; review against design, then code quality; fix findings; launch Electron with disposable app data and inspect UI; document exact launch command and live-auth limits.

## Verification results

- Repository tests: 269 passed (desktop 48, providers 34, core 52, web 135).
- Desktop TypeScript and production build passed.
- Biome checks passed for touched desktop source/tests, provider adapter, and root package manifest.
- Live Codex subscription request returned OK. The Electron UI connection test also succeeded through the real IPC/engine path.
- Electron smoke: selected Codex, persisted its default model, and continued into onboarding; zero renderer errors. Test data isolated under `/tmp`.
- Auth and runtime received separate spec and code-quality reviews; reported issues fixed and re-reviewed.
- Claude and xAI consent/model execution were not tested with live accounts; their login/refresh/error paths were verified with fixtures. The user completes browser consent on launch.
- Local branch `feat/subscription-login`, based on PR #49 commit `877c273a5f74fe5b4948aa65d47c0763db43af99`. No push or PR.
