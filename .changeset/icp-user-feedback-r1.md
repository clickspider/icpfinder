---
"@icpfinder/core": minor
"@icpfinder/providers": minor
---

ICP discovery user-feedback round 1 — two-phase API, archetype reasoning, opt-in deepening.

Core schema additions (back-compat — all new fields optional):

- `Archetype.reasoning` — short paragraph explaining why this persona belongs in the set.
- `Archetype.sellingAngle` — one-line outreach hook for the persona.
- `Archetype.objections` — top 3 likely "no" lines.
- `ExampleCompany.whyNow` — concrete recent trigger for this specific company.
- `Candidate.whyNow` — propagated from the matching example company.
- New exported `DeepenResult` type — `{ candidateId, trigger, provenanceUrl, dossier }`.

New IcpFinder method:

- `IcpFinder.enrichOne(archetype, { candidatesPerArchetype, offset?, signal?, budgetCapCents? })` — phase-2 helper that yields candidate + cost + recoverable-error events for ONE archetype. Powers the new two-phase web API (`/api/archetypes` then `/api/candidates`). Existing `find()` still works unchanged for SDK consumers.

Providers:

- Updated `GeminiLlmProvider` stub payload to include the new archetype fields so stub-mode UI renders identically to live mode.
