# IcpFinder for macOS

Find your ICPs and research companies using your Claude, ChatGPT/Codex, or eligible xAI/Grok subscription.

## Run locally

From the repository root:

```bash
bun install
bun run dev:desktop
```

The desktop opens with the reviewed welcome screen. Enter your website or a written idea description, then connect an AI account before the business overview is generated. A single connected account is suggested; otherwise the three providers receive equal treatment with none preselected. Choosing an account enables Continue. Back and Cancel preserve your product input. Account settings and **Test connection** remain available in **Connectors**. The idea path is a writing page with one Continue action, not a chat: the selected AI builds a brief from that single description, leaving unspecified details blank.

- **Claude:** the app bundles a pinned native Claude runtime. No separate Claude Code installation, Node.js, or npm is required by the end user. It starts `claude auth login --claudeai` and recognizes an existing subscription login. Research runs through the bundled executable with the selected model.
- **ChatGPT / Codex:** the app bundles a pinned native Codex runtime. No separate CLI installation is required. It starts `codex login` and recognizes an existing ChatGPT login. Research uses Codex's default model, read-only sandbox, and web search when requested. API-key login does not qualify.
- **xAI / Grok:** no CLI is needed. Approve the device code in your browser using an eligible Grok account. The app stores encrypted OAuth credentials locally and refreshes them as needed. Access to the chosen Grok model and web search depends on your account's entitlements. Provider denial is shown directly; the app never substitutes an API key or another account.

Claude and Codex account changes also affect those CLIs on this Mac. Their CLI credential stores remain owned by those tools. xAI credentials are encrypted using Electron safeStorage and kept separately from workspace JSON. The app refuses to save xAI credentials if secure storage is unavailable. Sign-in can be cancelled and retried.

Research, light classification, and the in-app browser agent use the selected provider. The browser agent retains its ask-before-send step. Gmail drafts through Claude's Gmail connector and the external **Claude in Chrome** integration require Claude; Codex/xAI use IcpFinder's embedded browser for social pages. Subscription selection cannot change during active workspace research or browser work. Usage is attributed to the selected provider; unavailable plan limits are not estimated.

## Business overview and customer profiles

Users review and correct their business overview before generating profiles. Audience (Businesses, Consumers, Both) and business progress describe the user’s business, not the target customer; legacy funding stages are not converted into progress. A marketplace assumption appears only when suggested or confirmed and can be corrected.

Profile generation uses the reviewed information to suggest customer groups, differentiated benefits, people or roles to approach, possible signals to look for, and advisory fit concerns. Consumer profiles use relevant personal characteristics rather than company sizes or job titles. These are hypotheses, not researched companies or confirmed buying intent.

**Go to my dashboard** completes onboarding without running AI or starting a company search. All generated and manually added profiles carry through and remain editable in the dashboard. Company hunting starts only through an explicit later action.

## Data

Workspace data lives in `~/Library/Application Support/IcpFinder/icpfinder.json`. Set `ICPFINDER_DATA_DIR` to use another folder. xAI sign-in lives in `subscription-xai.enc` in that folder; do not include it in bug reports. Temporary AI working files use its `ai-runtime` subfolder.

The original Next.js web app remains separate; these sign-in controls are in the Electron desktop app.

## Validation

```bash
bun run --filter @icpfinder/desktop test
bun run --filter @icpfinder/desktop typecheck
bun run --filter @icpfinder/desktop build
```

Tests simulate provider failures, token refresh/cancellation races, and browser execution. They do not log in to anyone's account. A live connection check requires the user's provider consent and an eligible subscription.

## Credits

Subscription authentication design references [OpenBot](https://github.com/CopilotKit/openbot), notably its official CLI sign-in approach and xAI device authorization implementation. The ICP and hunting method borrows ideas, rewritten in our own words, from [gtmskills.com](https://www.gtmskills.com/) (MIT, by Swan and its authors).

## Bundled runtimes and connection recovery

The first `dev` or `build` downloads the pinned official macOS runtime archives, verifies their SHA-512 checksums, and caches them under ignored `resources/runtime/<arch>/`. Later runs use the cache. The packaging hook prepares the target architecture and copies both runtimes outside the app ASAR. A fresh development build needs registry access; end users do not download tools during sign-in. Both Apple Silicon and Intel package checksums are pinned in `scripts/prepare-runtime.mjs`.

Connection failures share one screen with recovery actions matched to sign-in, temporary network, session, app component, and status-check failures. Cancellation remains separate. Missing app components offer another provider rather than promising a repair.
