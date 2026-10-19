// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { ContentPage } from "../../../components/marketing/ContentPage";
import { articleJsonLd } from "../../../lib/content-jsonld";

const PATH = "/guides/icp-vs-buyer-persona";
const TITLE = "ICP vs buyer persona: what is the difference?";
const DESCRIPTION =
  "An ICP describes the company you should sell to. A buyer persona describes the person inside it. A side-by-side table, examples, and which one to define first.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

export default function IcpVsPersonaGuide() {
  return (
    <ContentPage
      eyebrow="guide"
      title={TITLE}
      lede="An ideal customer profile (ICP) describes the company you should sell to. A buyer persona describes the person inside that company who feels the pain and signs off. Define the ICP first, then the persona."
      jsonLd={articleJsonLd(PATH, TITLE, DESCRIPTION)}
    >
      <h2>Side by side</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">ICP</th>
              <th scope="col">Buyer persona</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Describes</th>
              <td>A type of company</td>
              <td>A type of person in that company</td>
            </tr>
            <tr>
              <th scope="row">Key fields</th>
              <td>Industry, size, stage, tools, budget, trigger events</td>
              <td>Role, goals, daily pain, objections, where they look for help</td>
            </tr>
            <tr>
              <th scope="row">Answers</th>
              <td>Which accounts should we target?</td>
              <td>Who do we talk to, and what do we say?</td>
            </tr>
            <tr>
              <th scope="row">Used for</th>
              <td>Lead lists, territory, pricing</td>
              <td>Messaging, outreach, content</td>
            </tr>
            <tr>
              <th scope="row">Example</th>
              <td>Design agencies, 10 to 50 people, client work on Figma</td>
              <td>Agency owner who loses hours chasing client approvals</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Which one first?</h2>
      <p>
        Start with the ICP. A great persona at the wrong company still cannot buy. Once you know the
        company type, the persona tells you who to email and what pain to lead with.
      </p>

      <h2>Combine them: the archetype</h2>
      <p>
        For early-stage founders, an archetype joins both in one card: the company type, the role
        inside it, their pain, why they would buy now, and their first objection. icpfinder
        generates 3 archetypes like this from one product description, then finds real companies and
        up to 5 verified emails for the archetype you pick.
      </p>
      <p>
        Next: <a href="/guides/find-your-icp">how to find your ICP as a solo founder</a>, in 6
        steps.
      </p>
    </ContentPage>
  );
}
