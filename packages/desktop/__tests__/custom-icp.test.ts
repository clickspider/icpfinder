import { describe, expect, it, vi } from "vitest";
import { customIcp, refineCustomIcps } from "../src/main/custom-icp";
import { productFromIdea } from "../src/main/idea";

const draft = {
  title: "Studio owners",
  tag: "Small studios · 2–10 people",
  fit: "Less billing work",
  buyer: "The owner",
  signal: "New client projects",
  skip: "Marketplace payments only",
};
const product = productFromIdea("Invoicing for studios", { sell: "Invoicing" });
const criteria = {
  mustHave: ["2–10 people (source: team page)"],
  signals: ["New projects"],
  dealBreakers: ["Marketplace only"],
};

describe("custom onboarding ICP", () => {
  it("preserves every field and marks the saved profile for refinement", () => {
    const icp = customIcp(draft, 3);
    expect(icp).toMatchObject({
      name: draft.title,
      pain: draft.fit,
      sellingAngle: draft.fit,
      card: {
        edited: true,
        buyer: { text: draft.buyer, source: "you" },
        company: { text: draft.tag },
        trigger: { text: draft.signal },
        skip: { text: draft.skip },
      },
      companies: [],
    });
    expect(customIcp(draft, 3).id).not.toBe(icp.id);
  });
  it("rejects malformed or incomplete IPC payloads", () => {
    for (const value of [
      null,
      [],
      {},
      { ...draft, title: " " },
      { ...draft, skip: 42 },
      { ...draft, buyer: "a".repeat(241) },
    ])
      expect(() => customIcp(value, 0)).toThrow();
  });
  it("refines added profiles without changing existing ICPs or the founder's words", async () => {
    const existing = { ...customIcp(draft, 0), card: undefined };
    const added = customIcp(draft, 1);
    const refine = vi.fn().mockResolvedValue(criteria);
    await refineCustomIcps(product, [existing, added], refine);
    expect(refine).toHaveBeenCalledTimes(1);
    expect(added.criteria).toEqual(criteria);
    expect(added.card?.edited).toBe(false);
    expect(added.card?.buyer.text).toBe(draft.buyer);
    expect(existing.criteria).toBeUndefined();
  });
  it("keeps a failed profile retryable and does not repeat completed refinements", async () => {
    const first = customIcp(draft, 0),
      second = customIcp(draft, 1);
    const refine = vi.fn().mockResolvedValueOnce(criteria).mockResolvedValueOnce(null);
    await expect(refineCustomIcps(product, [first, second], refine)).rejects.toThrow(
      "details are saved"
    );
    expect(first.card?.edited).toBe(false);
    expect(second.card?.edited).toBe(true);
    const retry = vi.fn().mockResolvedValue(criteria);
    await refineCustomIcps(product, [first, second], retry);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
