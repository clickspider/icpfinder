// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { ContentPage } from "../../components/marketing/ContentPage";
import { FAQS, KEY_FACTS } from "../../lib/content";
import { faqJsonLd } from "../../lib/content-jsonld";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about icpfinder: what it does, what it costs, where your API keys go, and how it compares to Apollo, Clay and ChatGPT.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <ContentPage
      eyebrow="faq"
      title="icpfinder FAQ"
      lede="icpfinder is a free, open-source ICP finder. Paste a product idea and get 3 buyer archetypes, real companies and verified emails in about 30 seconds."
      jsonLd={faqJsonLd(FAQS)}
    >
      <h2>Key facts</h2>
      <ul>
        {KEY_FACTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {FAQS.map((f) => (
        <section key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </section>
      ))}
    </ContentPage>
  );
}
