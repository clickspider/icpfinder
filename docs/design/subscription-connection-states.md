# Subscription connection design

Approved locally on 2026-10-20. The state gallery was approved and integrated into onboarding.

## Locked entry states

- Known account: approved option 02. Show the account and Continue button. Keep “Or choose another provider” and the other two square provider cards visible. Never repeat the selected provider in those alternatives.
- No known default: approved option A. Show three equally styled square cards with none selected. Enable the Connect button only after an explicit choice. Do not infer a preference from provider order.
- Preserve the split layout, soft cards, typography, and product context. No redundant subscription punchline or alternatives toggle.

## State gallery

`SubscriptionDesignPreview.tsx` supplies one fixture per tab: known account, no default, provider selected, checking accounts, browser sign-in, device code, connected, cancelled, sign-in error, session expired, setup needed, and status unavailable.

All gallery states have been approved. The setup-needed state now describes app runtime recovery: both Claude and Codex ship with the app. Actions simulate transitions only; no account changes, installation, browser sign-in, or AI requests occur. The device code is an example.

The intended production sequence remains welcome → product entry → account connection before any AI work. The gallery is available separately through `?state-preview=1`; normal startup opens the welcome screen.
