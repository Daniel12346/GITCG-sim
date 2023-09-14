"use client";

import MyInfo from "@/components/LobbyInfo";
import dynamic from "next/dynamic";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function Lobby() {
  const LobbyInfoNoSSR = dynamic(() => import("@/components/LobbyInfo"), {
    ssr: false,
  });
  const LobbyChannelNoSSR = dynamic(() => import("@/components/LobbyChannel"), {
    ssr: false,
  });
  const GameBoardNoSSR = dynamic(() => import("@/components/GameBoard"), {
    ssr: false,
  });
  const router = useRouter();

  return (
    <div className="pt-20 max-w-xl w-full">
      <div>
        <button
          className=" text-orange-300 p-0.5 outline mb-4 "
          onClick={() => {
            router.push("/");
          }}
        >
          {"<-"} cancel
        </button>
        <LobbyInfoNoSSR />
        <LobbyChannelNoSSR />
      </div>
    </div>
  );
}
