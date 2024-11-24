"use client";
import dynamic from "next/dynamic";

const MyProfileNoSSR = dynamic(() => import("@/components/MyProfile"), {
  ssr: false,
});
export default function Me() {
  return (
    <div className="flex justify-center max-w-lg mt-3">
      <MyProfileNoSSR />
    </div>
  );
}
