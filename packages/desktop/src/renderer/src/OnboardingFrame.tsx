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
            <h2>A little about you. A clearer idea of who to approach.</h2>
            <ol className="ob-steps">
              <li>
                <b>Tell us what you offer</b>
                <p>Share your website or describe it in a few sentences.</p>
              </li>
              <li>
                <b>Fill in a few details</b>
                <p>Tell us how your business works and where you are today.</p>
              </li>
              <li>
                <b>Discover who to focus on</b>
                <p>
                  Get suggested customer profiles, with roles to look for and reasons to reach out.
                </p>
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
              {kind === "idea" ? "Start with what you know." : "A little context goes a long way."}
            </h2>
            <p className="ob-aside-copy">
              {kind === "idea"
                ? "You don’t need to have your ideal customer figured out. That’s what we’re here to explore."
                : "We’ll use your website to understand what you sell, the problem it solves, and who could benefit."}
            </p>
            <div className="ob-aside-rule" />
            <p className="ob-aside-small">
              {kind === "idea"
                ? "A rough description is enough. You can refine it later."
                : "You’ll have a chance to review the details before we suggest customer profiles."}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
