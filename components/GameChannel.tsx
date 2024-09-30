import {
  myIDState,
  currentGameIDState,
  myInGameCardsState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";

export default function GameChannel() {
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  const myID = useRecoilValue(myIDState);
  const gameID = useRecoilValue(currentGameIDState);
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  //TODO: move to a separate file again
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID } },
    });
    channel
      .on("presence", { event: "join" }, ({ key }) => {
        console.log("presence join", key, myID);
        //the player that joined first will send the deck to the opponent when the opponent joins
        if (
          key !== myID &&
          channel.presenceState.length < 2 &&
          (!opponentCards || !opponentCards.length)
        ) {
          channel.send({
            type: "broadcast",
            event: "share_deck",
            payload: { cards: myCards, isFirstShare: true },
          });
        }
      })
      .on("presence", { event: "sync" }, () => {
        // //TODO: is this necessary in sync event?
        // if (!opponentCards || !opponentCards.length) {
        //   channel.send({
        //     type: "broadcast",
        //     event: "share_deck",
        //     payload: { cards: myCards },
        //   });
        // }
      })
      .on("broadcast", { event: "share_deck" }, ({ payload }) => {
        if (payload?.cards && payload?.cards.length > 0) {
          setOpponentInGameCards(payload?.cards);
        }
        //used only once to initialize the deck
        if (payload.isFirstShare) {
          channel.send({
            type: "broadcast",
            event: "share_deck",
            payload: { cards: myCards, isFirstShare: false },
          });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            online_at: new Date().toISOString(),
            cards: myCards,
          });
          // TODO: when exactly should I send the deck?
          // channel.send({
          //   type: "broadcast",
          //   event: "share_deck",
          //   payload: { cards: myCards, playerID: myID },
          // });
        }
      });
    setChannel(channel);
    return () => {
      console.log("unsubscribing");
      supabase.removeChannel(channel);
      setChannel(null);
    };
  }, []);
  return null;
}
