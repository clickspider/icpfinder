// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { ContentPage } from "../../components/marketing/ContentPage";
import { PLANS, PRICING_UPDATED } from "../../lib/content";
import { articleJsonLd } from "../../lib/content-jsonld";

const PATH = "/pricing";
const TITLE = "icpfinder pricing";
const DESCRIPTION =
  "icpfinder is free. Use the free demo with no signup, add your own Gemini and Hunter keys for unlimited runs, or self-host it under the MIT license.";

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: PATH, types: { "text/markdown": "/pricing.md" } },
};

export default function PricingPage() {
  return (
    <ContentPage
      eyebrow="pricing"
      title={TITLE}
      lede="icpfinder costs nothing. There are no paid plans and no signup. You choose how runs are powered: the free demo, your own API keys, or your own server."
      updated={PRICING_UPDATED}
      jsonLd={articleJsonLd(PATH, TITLE, DESCRIPTION, PRICING_UPDATED)}
    >
      {PLANS.map((plan) => (
        <section key={plan.name}>
          <h2>{plan.name}</h2>
          <p>
            <strong>Price:</strong> {plan.price}
          </p>
          <p>
            <strong>For:</strong> {plan.forWho}
          </p>
          <ul>
            {plan.limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Where the money goes</h2>
      <p>
        icpfinder itself charges nothing. Costs come from the two providers a run calls: Google
        Gemini writes the archetypes, and Hunter finds and checks the emails. The{" "}
        <a href="https://github.com/clickspider/icpfinder/blob/main/docs/costs.md">cost guide</a>{" "}
        shows the cost of each call and the budget caps.
      </p>
      <p>
        Get keys: <a href="https://aistudio.google.com/app/apikey">Google Gemini</a> and{" "}
        <a href="https://hunter.io/api-keys">Hunter.io</a>. Paste them under{" "}
        <a href="/find#keys">keys</a> on the run page.
      </p>
    </ContentPage>
  );
}
