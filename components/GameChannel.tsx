import {
  myIDState,
  usersInLobbyIDsState,
  currentGameIDState,
  opponentIDState,
  myInGameCardsState,
  opponentInGameCardsState,
  amIReadyForNextPhaseState,
  isOpponentReadyForNextPhaseState,
  gameChannelState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";

export default function LobbyChannel() {
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const gameID = useRecoilValue(currentGameIDState);
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);
  const myDeckInGameCards = useRecoilValue(myInGameCardsState);
  const opponentInGameCards = useRecoilValue(opponentInGameCardsState);

  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID }, broadcast: { self: true } },
    });
    // channel && setGameChannel(channel);
    console.log("channel", channel);
    channel
      .on("presence", { event: "sync" }, () => {
        console.log("opp. ", opponentInGameCards);
        if (!opponentInGameCards || !opponentInGameCards.length) {
          console.log("sending deck", channel);
          channel.send({
            type: "broadcast",
            event: "share_deck",
            payload: { cards: myDeckInGameCards },
          });
        }
      })
      .on("broadcast", { event: "share_deck" }, ({ payload }) => {
        console.log("share_deck", payload);
        if (payload?.cards && payload?.cards.length > 0) {
          setOpponentInGameCards(payload?.cards ?? []);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            online_at: new Date().toISOString(),
            opponent_id: "",
          });
          console.log(presenceTrackStatus);
        }
      });
    //  setGameChannel(channel);
    return () => {
      // TODO: why does this unmount when I enter the game?
      console.log("unsubscribing");
      supabase.removeChannel(channel);
    };
  }, []);
}
