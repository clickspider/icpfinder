# Subscription sign-in

Build locally on PR #49, no push or PR. The Electron desktop is the supported launch target.

Use official local Claude and Codex CLI browser sign-in, preserving existing subscription logins and checking actual authentication (not executable presence). Unlike OpenBot, Electron needs no container to run those CLIs. xAI uses OpenBot's documented device authorization and token refresh flow. API keys must not take precedence on these paths. Never expose tokens through preload, renderer state, logs, or ordinary workspace JSON; protect xAI tokens with Electron safeStorage and private atomic files.

A subscription panel available before onboarding and in Connectors presents Claude, ChatGPT/Codex, and xAI with status, sign-in/cancel, verification, and provider selection. Persist the selected provider and provider-specific model. Existing saves default to Claude. Do not switch providers silently after errors.

Route research and light tasks through a common LlmProvider interface. Codex uses its CLI with subscription auth, read-only sandbox and web search. xAI uses OAuth-authorized model calls with web search for grounding. Route the browser agent through the selected provider; preserve ask-before-send behavior. Claude-specific connectors must clearly require Claude rather than silently spend another account. Record usage under the correct provider; do not invent plan limits.

Tests cover authenticated vs installed, API credential exclusion, login cancellation, xAI expiry/refresh and private persistence, provider routing, errors, and migration. Run desktop/provider tests, types and build. Launch Electron and inspect onboarding. Live sign-in needs the user's consent and live model checks need an available subscription; distinguish verified behavior from fixture tests.
