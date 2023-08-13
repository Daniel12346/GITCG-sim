"use client";

import {
  IDsOfPlayersInGameState,
  myIDState,
  mySessionState,
} from "@/recoil/atoms";
import { Suspense, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useLobbyChannel } from "../hooks/channelHooks";
import { create } from "domain";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Lobby() {
  const supabase = createClientComponentClient<any>();
  const myID = useRecoilValue(myIDState);
  const [deckIDs, setDeckIDs] = useState<string[]>([]);

  //TODO: handle this better
  const { usersInLobbyIDs } = useLobbyChannel();
  return (
    <>
      <div>
        <h1>Lobby</h1>
        My Id: <span>{myID || ""}</span>
      </div>
      <div>Users in lobby: {usersInLobbyIDs.join(", ")}</div>
    </>
  );
}
