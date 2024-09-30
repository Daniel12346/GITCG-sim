import {
  myIDState,
  usersInLobbyIDsState,
  currentGameIDState,
  opponentIDState,
  amIPlayer1State,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";
import { uuid } from "uuidv4";

type FoundGamePayload = {
  gameID: string;
  player1ID: string;
  player2ID: string;
};
export default function LobbyChannel() {
  const myID = useRecoilValue(myIDState);
  const [usersInLobbyIDs, setUsersInLobbyIDs] =
    useRecoilState(usersInLobbyIDsState);
  const setCurrentGameID = useSetRecoilState(currentGameIDState);
  const setOpponentID = useSetRecoilState(opponentIDState);
  const setAmIPlayer1 = useSetRecoilState(amIPlayer1State);
  //TDO: use or remove
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const router = useRouter();
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    let isCancelled = false;
    const channel = supabase.channel("lobby", {
      config: { presence: { key: myID } },
    });

    const findRandomOpponentID = (userIDs: string[]) => {
      const usersInLobbyIDsExceptMe = userIDs.filter((id) => id != myID);
      if (!usersInLobbyIDsExceptMe.length) return "";
      const randUserIndex = Math.floor(
        Math.random() * usersInLobbyIDsExceptMe.length
      );
      const randID = usersInLobbyIDsExceptMe[randUserIndex];
      return randID;
    };
    channel
      .on("presence", { event: "join" }, async ({ key, newPresences }) => {
        if (key !== myID) return;
        const usersInLobbyIDs = Object.keys(channel.presenceState());
        setUsersInLobbyIDs(Object.keys(usersInLobbyIDs));
        if (usersInLobbyIDs.length < 2) return;
        const foundOpponentID = findRandomOpponentID(
          Object.keys(channel.presenceState())
        );
        try {
          const { data, error } = await supabase
            .from("game")
            //this side is designated as player1 because it creates the game and sends the game data to the opponent
            .insert({ player1_id: myID, player2_id: foundOpponentID })
            .select();
          if (error) throw error;
          if (!data) throw new Error("no data");
          const res = await channel.send({
            type: "broadcast",
            event: "found_game",
            payload: {
              gameID: data[0].id,
              player1ID: data[0].player1_id,
              player2ID: data[0].player2_id,
            },
          });
          router.push("/game/" + data[0].id);
          setAmIPlayer1(true);
          setOpponentID(foundOpponentID);
          setCurrentGameID(data[0].id);
        } catch (error) {
          //TODO!: handle error
          console.log("error", error);
        }
        //TODO: get game ID, send to both players
      })
      .on("presence", { event: "sync" }, () => {
        !isCancelled &&
          setUsersInLobbyIDs(Object.keys(channel.presenceState()));
        // const foundOpponentID = findOpponentID(
        //   Object.keys(channel.presenceState())
        // );
        // console.log("foundOpponentID:", foundOpponentID);
        // if (foundOpponentID) {
        //   channel.send({
        //     type: "broadcast",
        //     event: "found_game",
        //     payload: { myID, opponentID: foundOpponentID, gameID: uuid() },
        //   });
        // }
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("leave", key, leftPresences);
      })
      .on("broadcast", { event: "found_game" }, ({ payload }) => {
        const { player1ID, player2ID, gameID } = payload as FoundGamePayload;
        !isCancelled && setOpponentID(player1ID);
        setCurrentGameID(gameID);
        setAmIPlayer1(false);
        router.push("/game/" + gameID);
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
    setChannel(channel);
    return () => {
      supabase.removeChannel(channel);
      setChannel(null);
    };
  }, []);
  //TODO: what should this return?
  return <div>{}</div>;
}
