"use client";

import {
  IDsOfPlayersInGameState,
  myIDState,
  mySessionState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useMySession } from "../hooks/userDataHooks";
import { Suspense, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useLobbyChannel } from "../hooks/channelHooks";

export default function Lobby() {
  //TODO: make wrapper
  //createClientComponentClient always returns the same instance
  const supabase = createClientComponentClient<Database>();
  //TODO: fix my ID requiring session to be initialized here
  useMySession();
  const myID = useRecoilValue(myIDState);
  const [deckIDs, setDeckIDs] = useState<string[]>([]);

  //TODO: handle this better
  const { usersInLobbyIDs } = useLobbyChannel();
  useEffect(() => {
    
  }, [usersInLobbyIDs])
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <h1>Lobby</h1>
        My Id: {myID}
      </div>
      <div>Users in lobby: {usersInLobbyIDs.join(", ")}</div>
    </Suspense>
  );
}
