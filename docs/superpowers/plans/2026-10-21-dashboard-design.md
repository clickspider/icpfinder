# Remaining dashboard review

Reviewed with the existing Designer and Copywriter chats, 21 October 2026. Recommendations, not locked design decisions. No source changes or pushes during this review.

## Priority order

1. Your business and provider settings: preserve reviewed information and make recovery truthful.
2. Company research and ICP results: align evidence, actions, and partial/failure states.
3. Network, matching, usage, and browser tasks: clarify scope and status, then apply the native workspace layout.

## Your business

Use the native workspace header and readable overview, with the same reviewed business fields as onboarding: offer, problem, audience, business progress, and marketplace only when relevant. Remove the prominent pricing treatment; do not suggest pricing. Explicit editing should preserve saved information on cancel.

The existing refresh is consequential: it replaces business information before review and regenerates profiles. Some unmatched profiles without approved companies can disappear. This needs a review-before-apply flow; a friendly label alone cannot fix it. Written descriptions also need a valid refresh path rather than assuming a website.

## Company detail and populated ICP results

Replace the dense card mosaic and colorful action tiles with a clear research/evidence area and grouped next actions. Show full evidence when expanded. Use consistent, readable result columns or labelled stacked rows.

“Research company” describes the action better than “Approve fit.” Distinguish queued, researching, failed, and completed states. Keep earlier and partial results visible during failures. Make hidden-result counts truthful.

Evidence needs meaningful status and reason together: supported, needs checking, or not supported by this check. The current universal source-count legend is inaccurate: dates and finding type also affect status. A verified quote is not proof of a claim or buying intent. Keep score explanations separate from purchase probability.

## Network

Make importing LinkedIn connections the clear empty-state action. An import is a dated snapshot, not an ongoing connection. Opening LinkedIn's export page does not establish that an export was requested. Remove unsupported delivery-time promises and avoid giving the unavailable Instagram integration equal prominence.

Privacy wording must be scoped: the export is parsed locally, but company names derived from contacts can be sent to the selected AI for classification. Importing does not send messages. Deletion needs a clear scope and cancel action. Review duplicate company counts across profiles.

## Matching

Keep icon/slider controls readable, with business-wide scope and automatic-saving feedback. Distinguish settings that recalculate scores from those governing future searches. Label illustrative scores as examples. Replace Claude-specific wording with provider-neutral wording where the behavior is shared. Do not claim that a higher threshold guarantees better prospects.

## Usage

Lead with recorded IcpFinder usage, explicit provider/period/business filters, and units. Use ChatGPT as the account-facing name. Separate recorded tokens from account-wide allowance and estimated attribution. Missing data must not look like zero. Remove unconditional Claude explanations under other providers and prevent stale plan responses when switching filters.

## Browser tasks

Use the actual provider or neutral task branding, with running, approval-needed, stopped, completed, and failed states. Keep approval content and controls reachable. Back currently stops active work, so name that consequence.

Source confirms non-Claude in-app browser paths exist. Gmail, the user's Chrome integration, and certain LinkedIn tools remain Claude-specific. These provider paths were not exercised in this review. Do not promise universal send protection based only on prompt instructions; verify tool enforcement before making that claim.

## Settings

Use embedded native panels rather than full-page/onboarding-sized headings inside tabs. Separate provider selection, sign-in status, status-check errors, and model selection. Replace obsolete CLI installation advice with the established bundled-component connection-error behavior. Clearly label provider-specific optional services and avoid blanket evidence or no-sending claims.

## Shared design direction

Preserve the approved native workspace: white/off-white surfaces, restrained neutral borders, compact headings, readable body text, consistent spacing, and one scroll owner. Keep Rich backgrounds in onboarding. Preserve useful controls; don't remove capabilities as a styling shortcut.

## Review coverage

Live inspection: business overview, network empty state, matching, usage, and settings in the native app. Company detail, populated research results, and active browser-task states were reviewed in source because the current workspace has no companies and this review did not start research, sign-ins, imports, or outreach. Those states still need populated/narrow-window visual validation during implementation.

## Detailed specialist notes

- Designer: /tmp/icpfinder-remaining-design-review.md
- Copywriter: /tmp/icpfinder-remaining-copy-review.md
