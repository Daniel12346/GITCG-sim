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
import { useLobbyChannel } from "../hooks/channelHooks";
import { create } from "domain";
import MyInfo from "@/components/MyInfo";
import dynamic from "next/dynamic";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { RealtimeChannel } from "@supabase/supabase-js";
import LobbyChannel from "@/components/LobbyChannel";

export default function Lobby() {
  const MyInfoNoSSR = dynamic(() => import("@/components/MyInfo"), {
    ssr: false,
  });
  const LobbyChannelNoSSR = dynamic(() => import("@/components/LobbyChannel"), {
    ssr: false,
  });
  const router = useRouter();

  // const myID = useRecoilValue(myIDState);
  // const [usersInLobbyIDs, setUsersInLobbyIDs] =
  //   useRecoilState(usersInLobbyIDsState);
  // const setCurrentGameID = useSetRecoilState(currentGameIDState);
  // const setOpponentID = useSetRecoilState(opponentIDState);
  // const [channel, setChannel] = useState<RealtimeChannel>();
  // useEffect(() => {
  //   const supabase = createClientComponentClient<Database>();
  //   let isCancelled = false;
  //   const channel = supabase.channel("lobby", {
  //     config: { presence: { key: myID }, broadcast: { self: true } },
  //   });
  //   !isCancelled && setChannel(channel);

  //   const findOpponentID = (userIDs: string[]) => {
  //     const usersInLobbyIDsExceptMe = userIDs.filter((id) => id != myID);
  //     if (!usersInLobbyIDsExceptMe.length) return "";
  //     const randUserIndex = Math.floor(
  //       Math.random() * usersInLobbyIDsExceptMe.length
  //     );
  //     const randID = usersInLobbyIDsExceptMe[randUserIndex];
  //     return randID;
  //   };
  //   channel
  //     .on("presence", { event: "sync" }, () => {
  //       !isCancelled &&
  //         setUsersInLobbyIDs(Object.keys(channel.presenceState()));
  //       const foundOpponentID = findOpponentID(
  //         Object.keys(channel.presenceState())
  //       );
  //       console.log("foundOpponentID:", foundOpponentID);
  //       if (foundOpponentID) {
  //         channel.send({
  //           type: "broadcast",
  //           event: "found_game",
  //           payload: [myID, foundOpponentID],
  //         });
  //       }
  //     })
  //     .on("presence", { event: "join" }, ({ key, newPresences }) => {
  //       console.log("join", key, newPresences);
  //     })
  //     .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
  //       console.log("leave", key, leftPresences);
  //     })
  //     .on("broadcast", { event: "found_game" }, ({ payload }) => {
  //       // const [game_id, ...player_ids] = payload as string[];
  //       if (payload.includes(myID)) {
  //         console.log("payload", payload);
  //         const opponentID = payload.filter((id: string) => id != myID)[0];
  //         !isCancelled && setOpponentID(opponentID);
  //         // setCurrentGameID(game_id);
  //         //TODO: create game (?)
  //         router.push("/game/");
  //       }
  //     })
  //     .subscribe(async (status) => {
  //       if (status === "SUBSCRIBED") {
  //         const presenceTrackStatus = await channel.track({
  //           online_at: new Date().toISOString(),
  //           opponent_id: "",
  //         });
  //         console.log(presenceTrackStatus);
  //       }
  //     });

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, []);
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
