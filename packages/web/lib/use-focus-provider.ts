// SPDX-License-Identifier: MIT
//
// useFocusProvider — derives which BYOK input the panel should highlight
// based on the most recent typed error from the run hook. Returns null when
// no provider-attributed error has occurred (or only network/unknown
// errors). Used by HeroSurface and /find to land focus on the right input.

"use client";

import { useMemo } from "react";
import type { RunError } from "./use-icp-run";

export function useFocusProvider(errors: RunError[]): "gemini" | "hunter" | null {
  return useMemo(() => {
    for (let i = errors.length - 1; i >= 0; i -= 1) {
      const err = errors[i];
      if (!err) continue;
      if (err.provider && err.code && err.code !== "unknown" && err.code !== "network") {
        return err.provider;
      }
    }
    return null;
  }, [errors]);
}
