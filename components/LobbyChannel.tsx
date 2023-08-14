import {
  myIDState,
  usersInLobbyIDsState,
  currentGameIDState,
  opponentIDState,
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
  //TDO: use or remove
  const [channel, setChannel] = useState<RealtimeChannel>();
  const router = useRouter();
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    let isCancelled = false;
    const channel = supabase.channel("lobby", {
      config: { presence: { key: myID }, broadcast: { self: true } },
    });
    console.log("channel", channel);
    // !isCancelled && setChannel(channel);

    const findOpponentID = (userIDs: string[]) => {
      const usersInLobbyIDsExceptMe = userIDs.filter((id) => id != myID);
      if (!usersInLobbyIDsExceptMe.length) return "";
      const randUserIndex = Math.floor(
        Math.random() * usersInLobbyIDsExceptMe.length
      );
      const randID = usersInLobbyIDsExceptMe[randUserIndex];
      return randID;
    };
    channel
      .on("presence", { event: "sync" }, () => {
        !isCancelled &&
          setUsersInLobbyIDs(Object.keys(channel.presenceState()));
        const foundOpponentID = findOpponentID(
          Object.keys(channel.presenceState())
        );
        console.log("foundOpponentID:", foundOpponentID);
        if (foundOpponentID) {
          channel.send({
            type: "broadcast",
            event: "found_game",
            payload: [myID, foundOpponentID],
          });
        }
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("join", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("leave", key, leftPresences);
      })
      .on("broadcast", { event: "found_game" }, ({ payload }) => {
        // const [game_id, ...player_ids] = payload as string[];
        if (payload.includes(myID)) {
          console.log("payload", payload);
          const opponentID = payload.filter((id: string) => id != myID)[0];
          !isCancelled && setOpponentID(opponentID);
          // setCurrentGameID(game_id);
          //TODO: create game (?)
          router.push("/game");
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
