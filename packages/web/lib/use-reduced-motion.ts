// SPDX-License-Identifier: MIT

"use client";

import { useEffect, useState } from "react";

/**
 * Reactive boolean for `prefers-reduced-motion: reduce`. SSR-safe: defaults
 * to false on the server and during first paint, flips on subsequent
 * effect tick if the user has reduced-motion enabled.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
