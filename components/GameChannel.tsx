import {
  myIDState,
  usersInLobbyIDsState,
  currentGameIDState,
  opponentIDState,
  myInGameCardsState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";

export default function LobbyChannel() {
  const myID = useRecoilValue(myIDState);
  const [usersInLobbyIDs, setUsersInLobbyIDs] =
    useRecoilState(usersInLobbyIDsState);
  const setCurrentGameID = useSetRecoilState(currentGameIDState);
  const setOpponentID = useSetRecoilState(opponentIDState);
  const gameID = useRecoilValue(currentGameIDState);
  //TDO: use or remove
  const [channel, setChannel] = useState<RealtimeChannel>();
  const router = useRouter();
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);

  const myDeckInGameCards = useRecoilValue(myInGameCardsState);
  const opponentInGameCards = useRecoilValue(opponentInGameCardsState);

  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID } },
    });
    console.log("channel", channel);
    channel
      .on("presence", { event: "sync" }, () => {
        // if (!opponentInGameCards) {
        //   channel.send({
        //     type: "broadcast",
        //     event: "share_deck",
        //     payload: myDeckInGameCards,
        //   });
        // }
      })
      .on("presence", { event: "join" }, () => {
        console.log("presence join", opponentInGameCards);
        // if (!opponentInGameCards.length) {
        channel.send({
          type: "broadcast",
          event: "share_deck",
          payload: { cards: myDeckInGameCards },
        });
        // }
      })
      .on("broadcast", { event: "share_deck" }, ({ payload }) => {
        console.log("game_start - opp. deck:", payload);
        if (payload?.cards && payload?.cards.length > 0) {
          setOpponentInGameCards(payload.cards);
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
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  //TODO: what should this return?
  return <div>{}</div>;
}
