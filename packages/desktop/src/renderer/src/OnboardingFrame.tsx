import type { Product } from "../../shared/types";
import { Mark } from "./ui";
import "./onboarding-frame.css";

export function AppBrand() {
  return (
    <div className="app-brand drag">
      <Mark size={28} radius={9} />
      <span>IcpFinder</span>
    </div>
  );
}

export function OnboardingAside({
  kind,
  product,
  name,
  loading,
}: {
  kind: "welcome" | "product" | "idea" | "ai" | "about";
  product?: Product;
  name?: string;
  loading?: boolean;
}) {
  return (
    <aside className="ob-aside">
      <div className="ob-aside-inner">
        {kind === "welcome" ? (
          <>
            <h2>
              A product.
              <br />A few good customers.
            </h2>
            <ol className="ob-steps">
              <li>
                <b>Tell us what you’re building</b>
                <p>A website or a few sentences is enough.</p>
              </li>
              <li>
                <b>Find the people it’s for</b>
                <p>Clear customer profiles you can refine.</p>
              </li>
              <li>
                <b>See who fits, and why</b>
                <p>Real companies, with evidence to review.</p>
              </li>
            </ol>
          </>
        ) : kind === "ai" ? (
          <>
            <h2 className="ob-product-name">{name || "Your idea"}</h2>
            <p className="ob-aside-copy">
              Next, your AI will read what you shared and put together your product brief.
            </p>
            <div className="ob-aside-rule" />
            <p className="ob-aside-small">You’ll review the details before we find your ICPs.</p>
          </>
        ) : kind === "about" ? (
          <>
            <h2>{product?.name || name || "Your product"}</h2>
            {loading ? (
              <div className="ob-brief-skeleton" aria-hidden="true">
                <span />
                <span />
              </div>
            ) : (
              <dl className="ob-brief">
                <dt>What you sell</dt>
                <dd>{product?.sell || "Not specified yet"}</dd>
                <dt>The problem</dt>
                <dd>{product?.problem || "Not specified yet"}</dd>
              </dl>
            )}
          </>
        ) : (
          <>
            <h2>
              {kind === "idea"
                ? "Start with what you know."
                : "Your product is the starting point."}
            </h2>
            <p className="ob-aside-copy">
              {kind === "idea"
                ? "What does it do? Who might need it? What gets easier for them?"
                : "We’ll read what you sell, the problem it solves, and who it could help."}
            </p>
            <div className="ob-aside-rule" />
            <p className="ob-aside-small">
              {kind === "idea"
                ? "A rough description is enough. You can refine it later."
                : "You’ll have a chance to review the details."}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
