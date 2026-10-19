// SPDX-License-Identifier: MIT

import { CONTENT_UPDATED, type Faq } from "./content";
import { MAKER, SITE_URL } from "./site";

/** schema.org Article for a dated text page. */
export function articleJsonLd(path: string, headline: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    datePublished: CONTENT_UPDATED,
    dateModified: CONTENT_UPDATED,
    author: { "@type": "Person", name: MAKER.name, url: MAKER.url },
    publisher: { "@id": `${SITE_URL}/#website` },
  };
}

/** schema.org FAQPage. Only use where the same Q&A is visible on the page. */
export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
