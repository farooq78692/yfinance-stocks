"use client";
import React, { useEffect } from "react";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "always",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
