// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { ContentPage } from "../../components/marketing/ContentPage";
import { COMPARISON } from "../../lib/content";
import { articleJsonLd } from "../../lib/content-jsonld";

const PATH = "/alternatives";
const TITLE = "icpfinder vs Apollo, Clay and ChatGPT";
const DESCRIPTION =
  "A free, open-source alternative to Apollo and Clay for the step before prospecting: finding who your customer is. Comparison table and when to use each tool.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

export default function AlternativesPage() {
  return (
    <ContentPage
      eyebrow="compare"
      title={TITLE}
      lede="Apollo and Clay help sales teams reach an ICP they already know. icpfinder helps you find that ICP in the first place: from one product idea to 3 buyer archetypes, real companies and verified emails in about 30 seconds. It is free and open source (MIT)."
      jsonLd={articleJsonLd(PATH, TITLE, DESCRIPTION)}
    >
      <h2>Comparison</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">icpfinder</th>
              <th scope="col">Apollo</th>
              <th scope="col">Clay</th>
              <th scope="col">ChatGPT prompt</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.icpfinder}</td>
                <td>{row.apollo}</td>
                <td>{row.clay}</td>
                <td>{row.chatgpt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-[color:var(--text-muted)]">
        Pricing and features of other tools change often. Check their own pricing pages before you
        decide.
      </p>

      <h2>When to use which</h2>
      <ul>
        <li>
          <strong>icpfinder:</strong> you have an idea or an early product and do not know yet who
          will pay. You want a first list of companies and people to talk to, today, for free.
        </li>
        <li>
          <strong>Apollo:</strong> you know your ICP and want a large contact database plus email
          sequences.
        </li>
        <li>
          <strong>Clay:</strong> you have lead lists and want to enrich, score and route them with
          many data sources.
        </li>
        <li>
          <strong>A ChatGPT prompt:</strong> you want quick brainstorming and do not need real,
          verified companies or emails.
        </li>
      </ul>
      <p>
        They work well together. Use icpfinder to find your ICP, then take it into Apollo or Clay
        once you need volume.
      </p>
      <p>
        New to ICPs? Start with{" "}
        <a href="/guides/find-your-icp">how to find your ICP as a solo founder</a>.
      </p>
    </ContentPage>
  );
}
