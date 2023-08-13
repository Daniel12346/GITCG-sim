"use client";

import { RecoilRoot } from "recoil";
import { ReactNode, Suspense } from "react";

const RecoilRootWrapper = ({ children }: { children: ReactNode }) => (
  <RecoilRoot>
    {children}
    {/* <Suspense fallback={<div>Loading..</div>}>{children}</Suspense> */}
  </RecoilRoot>
);

export default RecoilRootWrapper;
