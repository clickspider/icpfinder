# Subscription connection design

Connection behavior used by onboarding.

## Locked entry states

- Known account: Show the account and Continue button. Keep “Or choose another provider” and the other two square provider cards visible. Never repeat the selected provider in those alternatives.
- No known default: Show three equally styled square cards with none selected. Enable the Connect button only after an explicit choice. Do not infer a preference from provider order.
- Preserve the split layout, soft cards, typography, and product context. No redundant subscription punchline or alternatives toggle.

## Connection states

The connection flow covers known account, no default, provider selected, checking accounts, browser sign-in, device code, connected, cancelled, and connection failures.

Failures share a neutral provider-aware screen with a specific explanation and recovery action. App component failures offer another provider; they do not promise that retrying repairs the app. Status-check failure does not claim the account is disconnected. Cancellation remains separate. Browser sign-in asks users to return to IcpFinder; no automatic foreground return is promised.

The production sequence is welcome → business entry → account connection → reviewed business overview → suggested profiles → dashboard. Normal startup opens the welcome screen for new users.
