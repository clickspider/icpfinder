# Subscription connection design

Approved locally on 2026-10-20. The state gallery was approved and integrated into onboarding.

## Locked entry states

- Known account: approved option 02. Show the account and Continue button. Keep “Or choose another provider” and the other two square provider cards visible. Never repeat the selected provider in those alternatives.
- No known default: approved option A. Show three equally styled square cards with none selected. Enable the Connect button only after an explicit choice. Do not infer a preference from provider order.
- Preserve the split layout, soft cards, typography, and product context. No redundant subscription punchline or alternatives toggle.

## State gallery

`SubscriptionDesignPreview.tsx` supplies fixtures for known account, no default, provider selected, checking accounts, browser sign-in, device code, connected, cancelled, and five connection failures: sign-in, temporary, expired, app component, and status check.

Failures share a neutral provider-aware screen with a specific explanation and recovery action. App component failures offer another provider; they do not promise that retrying repairs the app. Status-check failure does not claim the account is disconnected. Cancellation remains separate. Browser sign-in asks users to return to IcpFinder; no automatic foreground return is promised.

Actions simulate transitions only; no account changes, installation, browser sign-in, or AI requests occur. The device code is an example.

The production sequence is welcome → business entry → account connection → reviewed business overview → suggested profiles → dashboard. The gallery is available through `?state-preview=1`, and the complete onboarding gallery through `?onboarding-review=1`; normal startup opens the welcome screen for new users.
