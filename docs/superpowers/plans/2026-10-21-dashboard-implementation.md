# Dashboard completion implementation plan

**Goal:** Apply the approved native workspace direction and truthful actions to all remaining dashboard pages, with Designer and Copywriter review. Local only.

**Architecture:** Preserve existing React/Electron flows and isolate dashboard styling from onboarding. Replace destructive business refresh with a read-only proposal and explicit save; preserve profiles and research. Reuse reviewed business vocabulary and provider status types.

**Tech stack:** React, TypeScript, Electron IPC, CSS, Vitest.

- [x] Business: ProductView, shared types, preload and main IPC. Explicit editable reviewed fields; conditional marketplace; read-only website refresh proposal, cancel and save. No profile regeneration or interruption. Test proposal patch semantics.
- [x] Settings: SubscriptionPanel, SettingsView, Connectors. Native embedded headings, provider-specific availability, no CLI install recovery, scoped service claims.
- [x] Company and ICP: CompanyView, IcpView, Criteria. Readable evidence and grouped actions, truthful status and source explanations, partial results retained.
- [x] Network: Network. Snapshot/import semantics, no false request confirmation, scoped privacy and deletion recovery.
- [x] Matching: Matching. Business scope, autosave failure/retry, examples and future-search distinction.
- [x] Usage: Usage. Recorded activity first, provider-aware limits, no stale responses, estimates clearly separate.
- [x] Browser: AgentView. Neutral branding, truthful stop/back, accessible approval controls.
- [x] Shared native CSS: typography, spacing, responsive panels, no onboarding changes.
- [x] Run desktop tests/typecheck, scoped Biome, build; have existing Designer/Copywriter review implementation; fix findings; package and inspect native app. Record limitations. No push.


## Verification and outcome

- Existing Designer and Copywriter chats reviewed the implementation. All five concrete review findings were fixed; both confirmed no remaining blockers in their reviewed scope.
- Desktop suite: 80 tests passed. TypeScript, scoped Biome (24 files), diff whitespace check, production renderer/main/preload build, and local ARM64 Mac packaging passed.
- Native UI checked: business overview/edit/cancel, provider settings, connected services, network empty state, usage with existing recorded activity, populated company results, candidate/failed rows, full evidence expansion, reopening a saved draft without regeneration, matching autosave and score recalculation.
- Populated checks used a disposable data directory outside the repository. The original workspace was restored afterward. No example/gallery code added to the app.
- No live sign-in, new AI research, external draft creation, outreach, real contact import, or browser approval execution was performed. Rare error/pending states and narrow-window layouts have source review but not exhaustive live UI coverage.
- The Mac build is a local unsigned development build. Nothing pushed or published.

## Behavioral decisions

Website refresh is now a read-only proposal, not recalibration. Save applies reviewed business fields only. Existing profiles, research, original source context, and legacy stored values are preserved. Description-only businesses use Edit overview. Future profile/research work uses the saved overview.

Completed company actions reopen their saved result; an explicit repeat action creates a new result (or another Gmail draft). Evidence statuses describe verification limits, not buying intent. Usage totals describe recorded activity, separately from Claude account estimates. Network counts deduplicate companies and import state describes a snapshot. Matching remains autosaved with visible save/failure/retry states.
