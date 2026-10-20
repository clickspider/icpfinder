import { productStage } from "../shared/onboarding";
import type { Product } from "../shared/types";

export const IDEA_MAX_LENGTH = 12000;
export function validateIdeaDescription(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Describe your idea to continue.");
  if (value.length > IDEA_MAX_LENGTH)
    throw new Error("Please keep your description under 12,000 characters.");
  return value.trim();
}

/** Missing details stay blank; the original description remains the source for research. */
export function productFromIdea(description: string, value: unknown): Product {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Couldn’t build your product brief. Please try again.");
  const fields = value as Record<string, unknown>;
  const text = (key: string) => (typeof fields[key] === "string" ? fields[key].trim() : "");
  if (!text("sell")) throw new Error("Couldn’t build your product brief. Please try again.");
  return {
    url: "",
    name: text("name") || "My idea",
    sell: text("sell"),
    problem: text("problem"),
    different: text("different"),
    price: text("price"),
    competitors: text("competitors"),
    model: (["B2B", "B2C", "B2B2C", "Marketplace"] as const).find(
      (model) => model.toLowerCase() === text("model").toLowerCase()
    ),
    stage: productStage(text("stage"), description) ?? "Idea",
    siteText: description,
    readAt: new Date().toISOString(),
  };
}
