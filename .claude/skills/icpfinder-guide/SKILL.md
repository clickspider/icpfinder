---
name: icpfinder-guide
description: The main IcpFinder guide - product decisions, brand voice, copywriting, design language, approved onboarding flow and the dynamic-content contract. Read it first before any UI, copy, flow or generated-content change in the IcpFinder repo, especially the Mac app in packages/desktop.
---

# IcpFinder — living product, design, and copy reference

Decisions recorded: 2026-10-21 (Europe/Amsterdam). Recheck current PR/branch status before continuing; the decisions remain valid unless the team changes them.

## Purpose and scope

This is the single, ongoing reference for work on IcpFinder: product decisions, design language, brand voice, copywriting, and approved experiences. Keep this material together in this one skill; do not split it into separate design and copy references. Use this reference for all IcpFinder work, regardless of which surface or feature is being changed.

Read the relevant sections before changing or extending IcpFinder. Add future approved decisions here, update superseded guidance in place, and distinguish durable principles from dated delivery notes. A PR that changes an approved decision updates this file in the same PR, so the guide on `main` is always current. Later explicit user decisions take precedence. Preserve unrelated engineering and design guidance when updating copy, and vice versa.

The brand and editorial principles apply to future IcpFinder work. Screen-specific layouts and strings below record the approved onboarding implementation, not blanket approval of unreviewed surfaces. These decisions supersede earlier design experiments and outdated comments describing marble/tie-dye backgrounds.

**Approved implementation baseline (2026-10-21):** Electron/macOS onboarding, subscription connection states, business review, profile discovery, and the handoff to the dashboard. The rest of the desktop app has NOT received the same design pass. Do not describe existing dashboard styling as approved or copy it back into onboarding. The Next.js web app is separate.

**Delivery snapshot (2026-10-21; verify before acting):** `feat/onboarding`, [PR #52](https://github.com/clickspider/icpfinder/pull/52), rebased onto `main` after #49 merged. All provider, UX, and copy work is consolidated on this one branch. Earlier separate subscription/design/copy branch names are retired. The next design effort concerns the rest of the app and belongs in its own PR.

## Brand voice and copywriting

Established during the onboarding copy review on 2026-10-21. Apply these editorial principles across IcpFinder, including future dashboard surfaces, product messaging, generated profiles, and recovery states. Exact onboarding strings remain in the approved flow section below. New surfaces require context-specific writing; existing dashboard copy is not automatically approved simply because it exists.

### The voice in one paragraph

IcpFinder sounds like a thoughtful colleague helping someone discover promising customers. Warm, conversational, concise, and useful. It respects what the user already knows, does the work it can do, and offers considered possibilities without pretending to have made a sale. It is confident about actions and honest about uncertainty. It creates anticipation through relevance and specificity, not hype, grand claims, or a performance of being AI.

If you remember one thing: **help the user see a useful possibility and understand their next step.**

### What we promise—and what we do not

Users bring an offer; IcpFinder helps them explore who could benefit and where to focus their prospecting. Onboarding produces suggested customer profiles. These are groups and qualification ideas, not actual customers, researched companies, named contacts, or confirmed buying intent. Company research comes later through a separate action. Sales work still determines whether a prospect becomes a customer.

The product accepts businesses, consumers, or both as audiences. Broad introductory copy must accommodate those audiences. Use company-specific language where the actual feature is company-specific. Consumer profile support does not establish that company hunting can source consumers.

Users connect a provider account to power IcpFinder. Explain that relationship when relevant. Do not describe an independent AI colleague helping us, suggest that IcpFinder supplies everyone's model usage, or promise every subscription supports every model or tool. Users do not need to install a separate AI app or CLI; IcpFinder includes its connection components.

### The principles behind the voice

#### 1. Begin with their purpose

Explain the benefit of the step, not the burden of completing it. The user is not here to help us fill out a database.

- Approved: “Let’s find your focus”.
- Avoid: “A little more about your business.” It announces more questions without explaining their purpose.
- Use “help us” sparingly. “Help us narrow it down” was considered but replaced: after several steps, repeatedly asking for help makes the user feel they are doing all the work.

Respect established businesses and services as well as new products. “What are you building?” and “Just an idea” unnecessarily assume a startup stage. “Tell us about your business.” and “I’ll describe it” are broader.

#### 2. Be conversational without becoming cute

Use everyday words, natural contractions, direct sentences, and brief titles. Warmth comes from understanding the situation, not adding jokes, exclamation marks, or fake excitement.

Approved examples: “Start with what you know.” / “Let’s find out” / “Here’s where we’d start.”

The user's enthusiastic or profane feedback is not a brief to put profanity into the product. Avoid sales aggression such as “Start hunting” in this onboarding voice. Technical states can be plain and calm; they do not need a clever headline.

#### 3. Promise the right level of certainty

Use possibility language where recommendations are uncertain: could, suggested, worth exploring, may not be a fit. Do not hedge clear actions or known facts. “Continue” does not need a qualifier; a suggested audience does.

- “Who could be your next customer?” leaves the sale open.
- “May not be a fit if” leaves room for qualification judgment.
- “Here’s where we’d start.” offers a recommendation rather than a definitive answer.

Avoid “proven buyers,” “guaranteed fit,” and wording that turns potential customers into customers. Two websites repeating a claim do not prove it true. Verification mechanics belong where users need to assess evidence, not as the main opening promise.

#### 4. Choose grounded optimism

The discovery moment should feel like useful possibilities are taking shape around the user's offer.

Approved pairing:
> Discovering who you could help.
> A few promising directions, built around what you do.

Avoid “Finding where you fit”: it felt too existential and sad. Avoid “Who needs what you do?”: it can sound dismissive, like questioning whether the offer has value. Avoid opening the reveal with “Not everyone is your customer”: it turns an anticipated result into a lesson about limitations.

Read proposed lines aloud and test their less charitable interpretation, not just the interpretation you intended.

#### 5. Give each piece of copy a distinct job

Write the screen as a whole. A line can be good alone and redundant beside another line.

- Headline: orient the user or frame the opportunity.
- Helper or field label: explain what to enter.
- Context panel: explain why it matters, what happens next, or provide reassurance.
- CTA: name the action the button actually performs.
- Reassurance: resolve a real concern at the point of decision.

“Your website” replaced a long helper because the right panel already explained how the website would be used. “Already signed in on this Mac” is enough; do not add two more versions of the same reassurance.

Keep headings short. Check actual wrapping at the intended window width. Do not solve overcrowding by shrinking readable text or removing necessary meaning. There is no universal word limit: clarity and the rendered layout decide.

#### 6. Use technical terms only when they clarify

“Provider” is appropriate on the connection page because users are choosing between named services. “AI” is useful in “Bring the AI you already use.” It need not appear in every explanation.

Prefer “customer profiles” to unexplained “ICPs” in introductory copy, “overview” to “brief,” and a named role to vague contact language. Do not describe bundled runtimes or token economics unless they help the user make a decision or recover from a problem. Internal preview tab names are not product-copy precedents.

### Patterns by situation

| Situation | Writing pattern | Approved example |
| --- | --- | --- |
| Welcome | Respect existing knowledge and invite discovery | “You know what you offer. Let’s find who could need it.” |
| Input | Ask only what is useful, in everyday language | “Who do you sell to?” |
| Guidance | Reduce uncertainty without implying extra work | “A rough description is enough. You can refine it later.” |
| Loading | Describe meaningful work without fabricated progress | “Getting to know your business…” |
| Discovery | Build anticipation around a credible result | “Discovering who you could help.” |
| Results | Recommend, without declaring certainty | “Here’s where we’d start.” |
| Reassurance | State what persists or can be changed | “All these profiles will be in your dashboard. You can edit them or add more there anytime.” |
| Error | Explain the known problem and an available recovery | “We couldn’t reach ChatGPT. Try again in a moment.” |

### Actions and transitions

“Continue” is a good button label for an ordinary intermediate step. Do not invent personality for every button. Use more specific wording when it clarifies a choice or destination: “Continue with ChatGPT,” “Edit overview,” “Save changes,” “Add a profile,” “Go to my dashboard.”

“Let’s find out” marks the transition from setup into discovery. It works because the surrounding page explains what will be discovered. Do not copy it into unrelated actions without that context.

Button copy must match behavior. Going to the dashboard does not automatically start research. A retry does not repair missing software. Do not promise automatic return from a browser, restoration, saved data, or a duration unless the behavior supports the claim. The unmeasured “About 1 minute” was removed.

### Generated customer profiles

This is a writing contract for generated content, not a set of static sample sentences.

**How many profiles** (decided 2026-10-21, from gtmskills icp-builder and outbound-strategy): 1 to 3, never padded to three. A profile is new only with a different buyer, a different reason to buy, or a different message. The same buyer that differs only in why-now (about to launch, tried a tool, priced out of an alternative) is ONE profile, with those moments as its signals. The results page centres 1 or 2 cards at the 3-card width.

**Hunting rules** (decided 2026-10-21, from gtmskills):
- A company that SELLS what the user sells is a competitor and a hard gate (score 0, never researched). A company that only USES a competitor's tool stays a lead.
- A hunt runs at most 2 rounds and stops early when a round adds no new strong fit; it then says the gap ("Found 1 of 3 strong fits…") instead of searching on.
- Must-haves and signals must be visible in public data, for many companies, today. No private facts (revenue, internal tools, what someone pastes into an AI chat).
- A signal counts only with its EVENT date, not the article date. Undated = unconfirmed. Newer signals score higher inside the window.
- The check step looks for proof that the signal does NOT mean need (a false positive) and then does not count it.
- The next search uses the user's approved companies as "more like these" and the rejected ones as "not like these".
- Equal scores: the company the user can reach (someone they know, a LinkedIn page, a found email) ranks first.

Each profile needs:
1. Relevant characteristics and a recognizable group name.
2. A distinct explanation of how that group could benefit from this user's offer.
3. **Who to talk to**: relevant roles for businesses, or the appropriate decision-making person for consumers. Never imply named contacts have been found.
4. **A reason to reach out**: a signal or circumstance to look for later. Do not imply it has been observed at a real company.
5. **May not be a fit if**: a meaningful qualification concern, presented as guidance rather than an automatic exclusion.
6. **Why we picked it** (approved 2026-10-21): one short sentence (max 14 words), written to the user ("you"), that names the one thing they shared (offer, problem, audience, progress or their own words) that points to this group. Prefer a concrete detail from their own description; never just echo a setting they chose ("You chose Businesses"). Each card has a different reason. It never names methods, research or sources, and never claims a company, contact or buying signal was found. Optional: a missing reason never fails the set; manually added profiles have none. It is written from the saved overview at generation time; editing the overview later does not rewrite it.

**Plain, correct English** (2026-10-21): no jargon or invented labels (“people who avoid new apps”, never “app-avoidant users”). Progress phrases: “You're at the idea stage”, “You're preparing to launch”, “You're looking for your first customers”, “You already serve customers”. “Who to talk to” names a concrete person with a role or life situation, never “the individual” or “the user”.

**No repetition across fields** (2026-10-21): each field adds something new. The reason must not restate the offer or the benefit; the characteristics must not repeat the title; the benefit must not repeat the product name or the offer word for word. Write a connection between the offer and the group. Merely repeating “save time” across three cards is not personalization. Do not invent differentiators to make cards appear varied; the distinctions must be supported by the business context.

For an invoicing example, “Keep invoicing from eating into the time founders need to build and sell” explains a founder-specific benefit; “Handle more complex billing without adding more manual work for operations” explains another group's needs. These are illustrative examples, not templates to paste into unrelated businesses.

Use reviewed and saved information. Do not overwrite user corrections with an earlier website interpretation. For consumers, use relevant needs and circumstances rather than forcing employee counts or job titles onto the card. All suggested profiles continue into the dashboard; users are not required to choose a winner during onboarding.

### Assumptions, review, and editing

If a material assumption shapes recommendations, make it visible and correctable before treating it as confirmed. Do not hide additional editable fields inside edit mode. View and edit should present the same applicable information with consistent labels and order. Avoid duplicate versions of audience and business progress on both sides of the page.

“Suggested” distinguishes inference from confirmed input. Show “Suggested from what you shared — change it if needed.” only when suggestions are ready and controls can be edited. The editor instruction is “Check that the details reflect your business.” Accuracy is the purpose; this is not merely a tone-polishing exercise.

The business overview section of this reference includes applicability rules, such as only surfacing marketplace structure when relevant. Follow that contract rather than exposing every internal field for completeness.

### Errors and provider states

Keep errors calm, specific, and actionable. Identify the affected provider dynamically. Do not blame the user's account or subscription without evidence.

Distinguish failure to sign in, known expiry, temporary inability to reach a provider, an IcpFinder component problem, and inability to check status. A failed status check does not establish expired authentication. Offer only actions that exist and can help. There is no universal reinstall remedy or automatic repair action.

Cancellation is separate from failure:
> Sign-in cancelled
> We’ve kept what you shared. Try again whenever you’re ready.

Do not resurrect “A little setup is needed.” for all connection errors. It was retired after the underlying causes became clear. “Claude needs a fix” also misattributes an app-component problem to the provider.

### Editing existing copy without drift

The approved onboarding strings are anchors, not an invitation to rewrite every sentence on every pass. Correct material inaccuracies, ambiguity, repetition, or rendering problems. Do not generate stylistic churn simply because another phrasing is possible.

When drafting a new surface:
1. Establish what users know, what they want, and the exact action or result this screen delivers.
2. Check product facts and state variants before making promises.
3. Give the headline, supporting copy, labels, and action different jobs.
4. Offer a small number of genuinely different options, with a recommendation and a reason.
5. Resolve one decision at a time when collaborating with the team. Explore alternatives before locking; once approved, preserve the decision unless new evidence warrants reopening it.
6. Hand engineers exact strings separately from dynamic-content guidance and UX requirements. Mark examples as examples. Call out changes to data or behavior rather than disguising them as relabeling.
7. Review the rendered screen, including loading, empty, error, long-content, and audience variants. A preview review does not validate live authentication or actual AI-generated output.

### Final copy checklist

- Does this help the user understand a useful possibility or next action?
- Is the claim true at this point in the journey?
- Are we clear whether we mean a profile, a company, a role, a contact, or a customer?
- Does the wording fit established businesses, services, and the supported audience?
- Are we asking the user for something IcpFinder should infer or discover itself?
- Does each line add something, rather than repeat the next panel?
- Is the CTA accurate, and is recovery genuinely available?
- Are suggestions distinguishable from facts and material assumptions reviewable?
- Does generated copy explain this group's relevance rather than repeat generic benefits?
- Is the language warm and concise without being cutesy, aggressive, grandiose, or dismissive?
- Are durations, evidence claims, intent, persistence, and automatic actions supported?
- Does this preserve approved decisions and avoid reviving a rejected direction?

When the answers are sound, stop polishing and let the product do the work.


## Design language

### Overall character

Quiet, warm, clear, spacious, and recognizably IcpFinder. One strong heading and a clear next action. The product should welcome people and ask for information when needed. Avoid a dashboard of credentials, technical options, badges, and competing buttons on first launch.

Use restrained iconography to clarify content. Preserve the existing duotone icons, with teal strokes and small coral accents. Do not turn explanatory panels into icon collages. No decorative eyebrow sentences above right-panel headings, redundant slogans, or repeated reassurance competing with the main content.

### Color: Rich is the chosen surface

The approved option is **Rich** (option C in the current palette preview). Light and Balanced remain comparison fixtures, not equally approved defaults. Earlier Soft tint, Warm coral, Paper, Mint/blush, and old tie-dye experiments are not the direction.

Preserve the original pink/coral/peach family. Do not introduce a new mint/blush or other palette. Teal in the original icons does not imply a teal background theme.

| Role | Current implementation |
| --- | --- |
| Primary text | `--ink: #111114` |
| Muted text | `--muted: #6e6e73` |
| Faint text | `--faint: #8a8a8e` |
| Primary action / emphasis | `--accent: #e0244a` |
| Rich surface base | `#fff5f6` |
| Pink wash | `#ff8fa650`, radial ellipse at 12% 85%, transparent at 70% |
| Coral wash | `#ff6f6124`, radial ellipse at 0% 100%, transparent at 60% |
| Peach wash | `#ffb08a50`, radial ellipse at 95% 15%, transparent at 65% |
| Surface body text | `#7d6c74` |
| Surface supporting text | `#8a727d` |
| Original duotone icon accents | teal `#0f9384`, coral `#F26B3D` |

Use the actual shared CSS as the implementation source of truth; the table records the decision, not a second theme implementation. Loader and results use the same Rich palette. Do not revive the animated, heavily distorted marble/tie-dye background merely because `Marble` still exists in `glass.tsx`.

### Frame, typography, and brand

- Use the native system font stack: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Helvetica Neue`, sans-serif.
- Standard onboarding uses a white left panel for input/actions and a rounded Rich right panel for context.
- The current desktop left panel is 480px wide with 28px top, 38px horizontal, and 30px bottom padding; at widths below 1000px it becomes 440px with 30px horizontal padding. Keep the alignment consistent across screens.
- Main heading baseline: 38px, 1.12 line height, -1.4px tracking. Right heading: 32px, 1.2 line height, -1px tracking, reducing to 27px at the narrower breakpoint.
- Main body copy is generally 14px with generous line height; right-panel body is 16px. Supporting text is smaller and quieter. Preserve readable metadata rather than shrinking dynamic content to fit.
- Right panel: 14px outer inset, 20px corner radius, generous internal padding and a constrained reading width.
- Use `AppBrand`: 28px mark with 9px radius, 9px gap, `IcpFinder` wordmark at 13px/600. Position and surrounding space match the AI connection page across the standard flow.
- **Intentional exception:** discovery loader and profile results are centered full-stage moments. They have no top-left logo/wordmark. The mark inside the loader animation remains.
- Keep bottom actions reachable and give them real content padding, including when scrolling. Results have 40px bottom padding; do not rely on preview chrome to create breathing room.

### Controls and motion

- A clear primary CTA; quiet secondary actions and Back. No redundant “keep this one” beside an existing Continue-with-provider action.
- Provider tiles are square, not stretched rectangles. Alternative providers stay visible; no “Use another AI” disclosure/arrow is needed.
- Business audience/progress choices retain the approved icon cards, not plain unadorned choices.
- Writing is a softly outlined writing area with a clear click target, hover/focus treatment, and a Continue action. It is not a chat composer: no send button, transcript, microphone, or speech transcription.
- Website/description tab changes must not move the overall form up and down. Preserve the shared layout rows and right-panel heights.
- Overview edit mode flips the right panel onto a near-white form surface (`#fcfafb`), rather than placing form fields on the Rich gradient. Current flip is about 520ms; honor reduced motion.
- The eye/pencil view/edit switch uses icons with accessible names. Inactive faces are inert and hidden from assistive technology. Save/Cancel appear only in edit mode.
- Keep the existing discovery orbit animation. Rotating text describes work, not a percentage, measured progress, or a promised duration. All motion needs a reduced-motion alternative.

## Approved onboarding flow and copy anchors

Sequence: **Welcome → Website or written description → AI connection when needed → Business overview (loading then editable) → Finding ICPs → Your ICPs → Dashboard.**

Do not return the user to the website-entry page merely to show “Reading your site.” Once connection completes, advance to the overview page and show its loading state. Back is an intentional user action. Preserve entered business details through connection errors/cancellation.

### Welcome

- Heading: “Who could be your next customer?”
- Description: “You know what you offer. Let’s find who could need it.”
- CTA: “Let’s get started”
- Right heading: “A little about you. A clearer idea of who to approach.”
- Steps: “Tell us what you offer”; “Fill in a few details”; “Discover who to focus on”.
- Third-step body: “Get suggested customer profiles, with reasons they could be a fit and opportunities to reach out.”
- **No “About 1 minute”:** the full journey including sign-in and processing has not been measured.

### Business entry

Shared heading: “Tell us about your business.” Tabs: “I have a website” / “I’ll describe it”. Actions: Back / Continue.

Website label: “Your website”; placeholder: `https://yourbusiness.com`. The earlier “Start with your website…” helper was deliberately removed. Right heading: “A little context goes a long way.”

Description helper: “Describe what you offer and the problem it helps solve. A few sentences are enough to get started.” Placeholder: “e.g. We make invoicing software that helps small teams spend less time chasing payments.” Accessible label: “Describe your business”. Right heading: “Start with what you know.”

### Bring your AI

Heading: “Bring the AI you already use.” Description: “Choose which provider powers IcpFinder.” Use actual detected/selected provider names throughout.

- Known account: “Already signed in on this Mac”; primary “Continue with {provider}”; “Or choose another provider” above the two alternatives. Do not repeat the default among the alternatives.
- No known default: three equally styled provider cards, none selected. Do not promote a provider through ordering or an arbitrary default. Enable connection after explicit selection.
- Do not restore “READY ON THIS MAC”, redundant subscription/account slogans, or the removed top eyebrow.
- Right panel uses the submitted website/context, not technical runtime explanation. Shared body: “Once you continue, we’ll use what you shared to put together a short overview of your business.” Support: “You’ll review it before we suggest who to focus on.”
- Browser instruction: “Continue in your browser, then return to IcpFinder.” Completion does not guarantee that the app is brought to the foreground.

Connected: “You’re connected.” / “IcpFinder is ready to use your {provider} account.” / Continue.

Cancelled: “Sign-in cancelled” / “We’ve kept what you shared. Try again whenever you’re ready.” / Try signing in again / Choose another provider.

All errors use a shared connection-error screen, provider-specific explanation, useful recovery action, “Choose another provider”, and “Your business details are saved.”

| Failure | Meaning and recovery |
| --- | --- |
| Sign-in | Could not complete sign-in; sign in again. Do not claim expiry without evidence. |
| Temporary | Could not reach provider; try again in a moment. |
| Expired | Session is known to have expired; sign in again. |
| App component | IcpFinder cannot start the required connection component; offer another provider. Do not imply retry repairs files or require the user to install a CLI. |
| Status check | “We couldn’t check your {provider} connection.” / “Try again, or choose another provider to continue.” A failed check is not proof of failed authentication. |

The earlier “A little setup is needed” / “Restore IcpFinder” page is retired. Cancellation is not an error. The connection gallery has 13 states, including all five failure variants.

### Business overview

- Heading: “Let’s find your focus”.
- Loading: “Getting to know your business…”; disabled CTA “Preparing your overview…”. Use skeletons for generated content.
- Ready: “Check the overview, then tell us a bit about how your business works.” CTA: “Let’s find out”.
- Audience: “Who do you sell to?” — Businesses / Consumers / Both.
- Progress: “Where is your business today?” — Exploring an idea / Preparing to launch / Looking for first customers / Already serving customers.
- Preselect only when supported by supplied information. Show “Suggested from what you shared — change it if needed.” only when ready and editable.
- These answers describe the USER’S business, not their target buyers. Do not convert historical funding-stage values into business progress.
- Right panel shows business name, “What you offer”, “The problem you solve”, and other material inferred details where applicable. Every editable detail appears in view mode with the same labels/order. Audience/progress are edited only on the left.
- Editor helper: “Check that the details reflect your business.” Save persists changes into the summary used for generation and later research. Cancel preserves the previous saved version. Switching to view does not save the draft or expose Save/Cancel.
- No pricing advice or suggestion that IcpFinder will help price the product. Pricing is absent from this overview and its recommendation summary.
- Marketplace: show “Business structure” only when marketplace is suggested or confirmed true. Let the user correct it in edit mode; saving false/unknown removes the row from view and edit. Hidden marketplace values must not be silently confirmed by saving other fields.

### Finding ICPs

Heading: “Discovering who you could help.” Subtitle: “A few promising directions, built around what you do.” Back remains available as implemented.

Rotate these lines without implying measured progress:
1. Considering who could benefit most
2. Exploring what could make them a good fit
3. Shaping your suggested customer profiles

### Your ICPs

Heading: “Here’s where we’d start.” Subtitle: “A few customer groups that could benefit from what you offer.”

Near actions: “All these profiles will be in your dashboard. You can edit them or add more there anytime.” One action: Go to my dashboard. Back remains available. No profile selection is required. **No “Add a profile” in onboarding** (decided 2026-10-21): onboarding exists to get people to the dashboard as fast as possible; adding and editing profiles happens in the dashboard. Do not restore “Next: we’ll find real companies and check why they fit.”

**Cards use approved option A**, not the dropped B or alternate row design. Each contains characteristics, recognizable group name, differentiated benefit, “Who to talk to”, “A reason to reach out”, and “May not be a fit if”. The fit concern stays inside the card. Do not number the cards.

**Card hierarchy (approved 2026-10-21, “quiet hierarchy”, grouped):** a header row with an ink icon that fits the group, picked dynamically by the AI from a fixed set of 14 (shop, cart, phone, chat, code, people, briefcase, building, home, heart, school, megaphone, wrench, money), with words in the group name as the fallback; no coloured accent dots beside the group name; then the benefit paragraph; then, 10px below, a small “Why we picked it” label (0.75rem, 600, ink) with a 7px amber dot (#d8952b) and the reason in 0.85rem muted grey (#5f565b); then “Who to talk to” and “A reason to reach out” as plain sentence-case bold labels; one thin divider before “May not be a fit if” (ink label). The characteristics line is not on the card face; it stays in the profile and the dashboard editor. Generated text is shown as sentences.

**Results page colour rule:** red means only brand and the primary action. One neutral (ink) for icons and labels, amber only for the reason dot. No green or teal on this page.

**Results page controls:** “← Back” top-left above the panel (44px hit area, 0.95rem, 500, ink, subtle hover). “Go to my dashboard →” (in-app arrow, never ↗; press feedback scale 0.97, 100ms ease-out). Footer note #5f565b at 0.88rem. 48px under the button inside the panel. Cards enter with a fade and 8px rise, 520ms cubic-bezier(.22,1,.36,1), 40ms stagger; fade only under reduced motion.

The dashboard ICP page shows the reason as a “Why we picked it” box in its header. Below the header, the customer profile shows one line by default (“Talk to” and “Reach out when”, cut to fit, with “Show all”); clicking it opens the full profile, with “Show less” beside “Edit profile”. “How we match” has “← Back” above its title, which returns to the ICP the user came from.

Use content-sized shared grid tracks/subgrid so corresponding rows align across neighboring cards regardless of wrapping. Do not solve alignment with fixed heights that clip longer generated text. Characteristic, title, benefit, role, signal, and fit-concern content must remain readable. Preserve alignment at narrower widths and with manually added profiles.

## Dynamic-content contract

- Each recommendation must explain a specific connection between the user’s offer and that group’s needs. Do not repeat a generic benefit on every card.
- These are suggested profiles, not researched companies, identified contacts, observed buying intent, or guaranteed customers.
- A reason to reach out is a signal to look for later, not a claim that an event has been observed.
- “May not be a fit if” is judgment guidance, not an automatic exclusion rule.
- Use saved business corrections, audience, and progress. Original website/description content must not overwrite reviewed corrections.
- For consumers use relevant circumstances, needs, household traits, and the decision-making person; do not force company sizes or professional roles. For Both, allow both supported kinds.
- Preview invoicing examples illustrate this approach; they are not fixed generated copy.
- All generated and added profiles persist in the dashboard and remain editable. The six card fields can be edited there.
- “Go to my dashboard” only completes setup and opens the dashboard. It must not call AI, refine profiles, or start a hunt. Later explicit research can derive research criteria from edited profiles.
- Consumer profile generation does not imply that the existing company-hunting feature is a consumer sourcing engine.

## Technical context to retain

Claude and Codex use bundled pinned official runtimes and subscription login; users do not need a separate Claude/Codex app or CLI installed. Existing compatible logins may be recognized. Grok uses device authorization with encrypted local OAuth storage; account/model/tool eligibility still depends on the provider. Do not promise that any subscription grants every model or tool.

Provider choice applies to research, light tasks, and the embedded browser agent. Do not silently fall back to another account/provider. Claude-specific Gmail/Chrome integrations remain explicitly Claude-only. Keep API keys and custom endpoint environment variables from overriding subscription execution.

Any provider connection can fail: authentication, network, unavailable status, or an app dependency. Missing/damaged bundled runtime files are an IcpFinder component issue, even on a Mac that never had a separate CLI installed.

Workspace JSON and credentials are separate. Keep credentials and runtime caches out of Git and bug reports. An unrelated `docs/marketing/` draft was deliberately excluded from the onboarding PR.

## Implementation map

Paths below are relative to the repository root.

| Concern | Files |
| --- | --- |
| Flow and page copy | `packages/desktop/src/renderer/src/Wizard.tsx` |
| Shared brand / right panels | `packages/desktop/src/renderer/src/OnboardingFrame.tsx`, `onboarding-frame.css` |
| Overview view/edit | `packages/desktop/src/renderer/src/BusinessOverview.tsx` |
| Provider selection and errors | `SubscriptionConnection.tsx`, `ConnectionErrorCard.tsx`, `subscription-preview.css` in the renderer directory |
| Loader/results | `IcpReveal.tsx`, `icp-reveal-preview.css` in the renderer directory |
| Existing brand/icons | `styles.css`, `ui.tsx`, `glass.tsx` in the renderer directory |
| Galleries | `OnboardingGallery.tsx`, `SubscriptionDesignPreview.tsx` in the renderer directory |
| Saved business / inference contract | `packages/desktop/src/shared/business-overview.ts` |
| Profile generation and validation | `packages/desktop/src/main/suggested-profiles.ts`, `custom-icp.ts`, `engine.ts` |
| Dashboard handoff / persistence | `packages/desktop/src/main/index.ts` (`finishSetup`, `addIcp`, `updateProfile`) |
| Dashboard profile editing | `packages/desktop/src/renderer/src/ProfileEditor.tsx` |
| Subscription auth and execution | `packages/desktop/src/main/subscription-auth.ts`, `subscription-provider.ts`, `cli.ts` |
| Runtime packaging | `packages/desktop/scripts/prepare-runtime.mjs`, `before-pack.cjs` |

## Preview and verification

Normal startup must not open a design gallery. Append `?onboarding-review=1` to the renderer URL for the full screen gallery, or `?state-preview=1` for connection states. These use fixtures and do not perform real authentication or AI calls.

Before PR #52 publication: 295 workspace tests passed (74 desktop, 34 providers, 52 core, 135 web); root typecheck and affected builds passed. An Electron check against the rebased React 19 build verified consumer cards, adding a fourth profile, dashboard persistence/editing across reload, and no automatic hunt/AI usage. Controlled provider tests are not proof of live subscription authentication or real generated-output quality. No new live sign-in/paid-model test was performed in that pass.

For future design changes, verify long content, narrow windows, bottom action spacing, keyboard focus, reduced motion, disabled/loading states, switching view/edit repeatedly, saved versus draft values, connection errors/cancel, and the no-auto-hunt handoff. Preserve the approved copy unless a new copy packet or explicit request changes it.

## Extending IcpFinder beyond the approved baseline

Use this language to align the dashboard and other non-onboarding surfaces. Their detailed layouts and copy are not yet approved. Reuse the brand, palette, typography, hierarchy, spacing, restrained icons, and clear action patterns; do not mechanically give every screen the split onboarding layout. Review new states with the user rather than treating old dashboard UI or unused CSS variants as settled design.
