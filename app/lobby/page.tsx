"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

export default function Lobby() {
  const LobbyInfoNoSSR = dynamic(() => import("@/components/LobbyInfo"), {
    ssr: false,
  });
  const LobbyChannelNoSSR = dynamic(() => import("@/components/LobbyChannel"), {
    ssr: false,
  });

  const router = useRouter();

  return (
    <div className="pt-20 max-w-xl w-full">
      <button
        className="text-lg  text-slate-100  mb-4 text-center rounded px-2 py-1 bg-amber-800 hover:bg-amber-700"
        onClick={() => {
          router.push("/");
        }}
      >
        {"<"} cancel
      </button>
      <LobbyInfoNoSSR />
      <LobbyChannelNoSSR />
    </div>
  );
}
