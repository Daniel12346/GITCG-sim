"use client";

import {
  IDsOfPlayersInGameState,
  currentGameIDState,
  myCurrentDeckIDState,
  myIDState,
  mySessionState,
  opponentIDState,
  usersInLobbyIDsState,
} from "@/recoil/atoms";
import { Suspense, useEffect, useState } from "react";
import {
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import { create } from "domain";
import MyInfo from "@/components/MyInfo";
import dynamic from "next/dynamic";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function Lobby() {
  const MyInfoNoSSR = dynamic(() => import("@/components/MyInfo"), {
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
    <div>
      <button
        onClick={() => {
          console.log("router", router);
          router.push("/");
        }}
      >
        route
      </button>
      <MyInfoNoSSR />
      <LobbyChannelNoSSR />
    </div>
  );
}
