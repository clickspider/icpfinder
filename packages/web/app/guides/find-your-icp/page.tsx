// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { ContentPage } from "../../../components/marketing/ContentPage";
import { articleJsonLd } from "../../../lib/content-jsonld";

const PATH = "/guides/find-your-icp";
const TITLE = "How to find your ICP as a solo founder";
const DESCRIPTION =
  "A 6-step way to find your ideal customer profile (ICP) before you have customers: write the problem, list buyer archetypes, check real companies, and talk to 15 people.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

export default function FindYourIcpGuide() {
  return (
    <ContentPage
      eyebrow="guide"
      title={TITLE}
      lede="Your ideal customer profile (ICP) is the type of company that feels your problem most, can pay for a fix, and can say yes fast. As a solo founder you do not have sales data yet, so you find it by testing a few guesses against real companies and real people."
      jsonLd={articleJsonLd(PATH, TITLE, DESCRIPTION)}
    >
      <h2>The short answer</h2>
      <p>
        Write down the problem in one sentence. List 3 different buyer types who might have it. For
        each type, find 5 real companies and 1 person at each. Talk to those 15 people. The type
        where most people say "we have this problem and we pay to fix it" is your first ICP.
      </p>

      <h2>6 steps</h2>
      <ol>
        <li>
          <strong>Write the problem, not the product.</strong> One sentence: who loses what, how
          often. "Agencies lose 4 hours a week chasing client approvals" beats "a feedback tool".
        </li>
        <li>
          <strong>List 3 archetypes.</strong> Three different buyers who could have that problem,
          for example an agency owner, an in-house marketing lead and a freelance designer. Three is
          enough to compare, and few enough to test this week.
        </li>
        <li>
          <strong>Describe each archetype.</strong> Role, company size, the pain in their words, why
          they would buy now, and the objection they will raise first.
        </li>
        <li>
          <strong>Name 5 real companies per archetype.</strong> If you cannot name 5, the archetype
          is too vague or too small.
        </li>
        <li>
          <strong>Find one person at each company and ask.</strong> 15 short conversations. Ask how
          they handle the problem today and what it costs them. Do not pitch.
        </li>
        <li>
          <strong>Pick the archetype with the strongest pull.</strong> Look for urgency, an existing
          budget or workaround, and a fast decision. That is your first ICP. Re-check it after your
          first 10 paying customers.
        </li>
      </ol>

      <h2>What a good first ICP looks like</h2>
      <ul>
        <li>The problem happens often (weekly, not yearly).</li>
        <li>They already spend money or time on a workaround.</li>
        <li>One person can say yes without a long buying committee.</li>
        <li>You can name at least 50 more companies like them.</li>
      </ul>

      <h2>Do steps 2 to 5 in 30 seconds</h2>
      <p>
        icpfinder automates the middle of this process. Paste your product idea and it returns 3
        archetypes with role, pain, selling angle and objections, plus 3 to 8 real example companies
        each. Pick an archetype and it finds up to 5 verified emails at those companies, with a
        short opener for your first message. It is free and open source (MIT).
      </p>
      <p>
        Still unsure about the terms? Read{" "}
        <a href="/guides/icp-vs-buyer-persona">ICP vs buyer persona</a>. Comparing tools? See{" "}
        <a href="/alternatives">icpfinder vs Apollo, Clay and ChatGPT</a>.
      </p>
    </ContentPage>
  );
}
