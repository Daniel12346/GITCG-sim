//TODO: fix (makes everything client-side)
"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ReactNode, Suspense } from "react";

export default function InitSession({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient<Database>();
  return <>{children}</>;
}
