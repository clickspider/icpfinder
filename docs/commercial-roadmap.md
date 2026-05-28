# Commercial roadmap

> **Last reviewed:** 2026-05-28
>
> Re-review quarterly. If you're reading this more than 90 days after the date above, the answer might be stale.

## Current position

icpfinder is MIT, single-repo, no paid tier. The code at `github.com/clickspider/icpfinder` and the product at `icpfinder.dev` are the same product. There is no closed-source commercial component.

This is intentional. See [business-model.md](./business-model.md) for the reasoning.

## When (if ever) we add a paid tier

We will **not** add paid features speculatively. We will add them only after **all three** of these are true:

1. **Real demand signal.** Ten or more inbound requests for a hosted plan with features the BYOK self-host story can't cover (saved runs, team workspaces, premium provider access, etc).
2. **Sustained free usage.** A hosted demo or repo with enough recurring traffic that the marginal cost of running infrastructure is non-trivial.
3. **Concrete first paid feature.** A specific thing we know how to build that customers would pay for, not a vague "premium tier."

Until all three are true, building paid features is action faking.

## When we split into two repos

We **stay single-repo** unless one of these fires:

| Trigger | What it forces |
|---|---|
| A premium provider's ToS requires closed-source distribution of their adapter | Move that one adapter to a private folder or repo. Not the whole product. |
| Ten or more paying customers AND we have a closed-source feature they're paying for | Spin up `icpfinder-cloud` private repo consuming `@icpfinder/core` from npm. |

Neither has fired. Both are speculative. We do not pre-build for them.

Specifically, we will **not** do any of the following before a trigger fires:

- Create an `icpfinder-cloud` private repo.
- Extract `@icpfinder/brand` as a separate package.
- Add feature flags or license-key gates to `packages/web`.
- Move marketing site code out of the OSS repo.
- Move `packages/core` or `packages/providers` out of the OSS repo.

## When we revisit the license

See [business-model.md → Switch triggers](./business-model.md#switch-triggers).

## What lives where, currently

```
github.com/clickspider/icpfinder  (MIT, public)
├── packages/core/         streaming engine, published to npm
├── packages/providers/    Gemini + Hunter adapters, published to npm
└── packages/web/          icpfinder.dev marketing + free /find tool
```

There is no second repo. There is no private code. There is no "enterprise edition."

## The thing this doc exists to prevent

Three months from now, someone (probably the maintainer, possibly an LLM helping the maintainer) will say "we should probably set up the commercial side before we add Stripe / auth / accounts / dashboards." That instinct is correct in the abstract and wrong in the present. **Adding repo-splitting infrastructure before the triggers above is wasted work** that delays shipping product to users who don't exist yet.

Re-read the triggers. If none have fired, close this file and ship something that gets users.
