import { SupabaseClient } from "@supabase/supabase-js";
import { use, useEffect, useState } from "react";
import { useMySession } from "./userDataHooks";
import { useRouter } from "next/navigation";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  gameState,
  myBoardState,
  myIDState,
  myProfileState,
  opponentBoardState,
  opponentIDState,
  opponentProfileState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const useLobbyChannel = () => {
  const myID = useRecoilValue(myIDState);
  const [usersInLobbyIDs, setUsersInLobbyIDs] = useState<string[]>([]);
  const router = useRouter();
  const setOpponentID = useSetRecoilState(opponentIDState);
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("lobby", {
      config: { presence: { key: myID }, broadcast: { self: true } },
    });

    const untrackPresence = async () => {
      const presenceUntrackStatus = await channel.untrack();
      console.log(presenceUntrackStatus);
    };

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
        setUsersInLobbyIDs(Object.keys(channel.presenceState()));
        const foundOpponentID = findOpponentID(
          Object.keys(channel.presenceState())
        );
        console.log("foundOpponentID", foundOpponentID);
        if (foundOpponentID) {
          channel.send({
            type: "broadcast",
            event: "start_game",
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
      .on("broadcast", { event: "start_game" }, ({ payload }) => {
        if (payload.includes(myID)) {
          console.log("payload", payload);
          const opponentID = payload.filter((id: string) => id != myID)[0];
          setOpponentID(opponentID);
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
      untrackPresence();
      channel.unsubscribe();
    };
  }, [myID]);
  return { usersInLobbyIDs };
};

export const useCreateGame = () => {
  const [game, setGame] = useRecoilState(gameState);
  // const [myBoard, setMyBoard] = useRecoilState(myBoardState);
  // const [opponentBoard, setOpponentBoard] = useRecoilState(opponentBoardState);
  const [me] = useRecoilState(myProfileState);
  const opponent = useRecoilValue(opponentProfileState);
  const supabase = createClientComponentClient<Database>();
  useEffect(() => {
    const createGame = async () => {
      if (!me || !opponent) return;
      const { data, error } = await supabase
        .from("game")
        .insert({ player1_id: me.id, player2_id: opponent.id })
        .select();
      if (error || !data) {
        console.log("error", error);
        return;
      }
      const game = data[0];
      setGame(game);
    };
    createGame();
  }, [supabase]);
  return game;
};

// export const useCreateGame = () => {
//   const [game, setGame] = useRecoilState(gameState);
//   // const [myBoard, setMyBoard] = useRecoilState(myBoardState);
//   // const [opponentBoard, setOpponentBoard] = useRecoilState(opponentBoardState);
//   const [me] = useRecoilState(myProfileState);
//   const opponent = useRecoilValue(opponentProfileState);
//   const supabase = createClientComponentClient<Database>();
//   useEffect(() => {
//     const createGame = async () => {
//       if (!me || !opponent) return;
//       const { data, error } = await supabase
//         .from("game")
//         .insert({ player1_id: me.id, player2_id: opponent.id })
//         .select();
//       if (error || !data) {
//         console.log("error", error);
//         return;
//       }
//       const game = data[0];
//       setGame(game);
//     };
//     createGame();
//   }, [supabase]);
//   return game;
// };
