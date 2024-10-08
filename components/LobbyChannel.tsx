import { createRandomDice, drawCards } from "@/app/actions";
import {
  myIDState,
  usersInLobbyIDsState,
  currentGameIDState,
  opponentIDState,
  amIPlayer1State,
  myInGameCardsState,
  opponentInGameCardsState,
  myDiceState,
  opponentDiceState,
  currentPlayerIDState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";
import { cardFromBasicInfo } from "@/app/utils";

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
  const setMyCards = useSetRecoilState(myInGameCardsState);
  const setOpponentCards = useSetRecoilState(opponentInGameCardsState);
  const setMyDice = useSetRecoilState(myDiceState);
  const setOpponentDice = useSetRecoilState(opponentDiceState);
  const setCurrentPlayerID = useSetRecoilState(currentPlayerIDState);
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

          const [myCards, opponentCards] = await Promise.all(
            [myID, foundOpponentID].map(async (id) => {
              const { data } = await supabase
                .from("profile")
                .select("current_deck_id")
                .eq("id", id)
                .single();
              const currentDeckID = data?.current_deck_id;
              const { data: deckData } = await supabase
                .from("deck")
                .select("*, deck_card_basic_info(*)")
                .eq("id", currentDeckID)
                .single();
              if (!deckData) return;
              const cardsBasicInfo = deckData?.deck_card_basic_info;
              const cardsBasicInfoIDs = cardsBasicInfo?.map(
                (card) => card.card_basic_info_id
              );
              if (!cardsBasicInfoIDs) return;
              const { data: cardData, error: cardError } = await supabase
                .from("card_basic_info")
                .select("*, effect_basic_info(*)")
                .in("id", cardsBasicInfoIDs);
              if (cardError) throw cardError;
              const cardsBasicInfoWithQuantities = cardData.map(
                (cardBasicInfo) => ({
                  ...cardBasicInfo,
                  quantity:
                    deckData.deck_card_basic_info.find(
                      (deckCardInfo) =>
                        deckCardInfo.card_basic_info_id === cardBasicInfo.id
                    )?.quantity ?? 0,
                })
              );
              let cardsInGameInitial: CardExt[] = [];
              console.log(
                "myCurrentDeckCardsBasicInfo",
                cardsBasicInfoWithQuantities
              );

              cardsBasicInfoWithQuantities.forEach((cardBasicInfo) => {
                const quantity = cardBasicInfo.quantity || 1;
                for (let i = 0; i < quantity; i++) {
                  const card = cardFromBasicInfo(cardBasicInfo, id);
                  cardsInGameInitial.push(card);
                }
              });
              return drawCards(cardsInGameInitial, 5);
            })
          );

          const myDice = createRandomDice(8);
          const opponentDice = createRandomDice(8);

          await channel.send({
            type: "broadcast",
            event: "game_data",
            payload: {
              gameID: data[0].id,
              player1ID: data[0].player1_id,
              player2ID: data[0].player2_id,
              myCards,
              opponentCards,
              myDice,
              opponentDice,
            },
          });
          setCurrentGameID(data[0].id);
          setOpponentID(data[0].player2_id);
          setAmIPlayer1(true);
          setCurrentPlayerID(data[0].player1_id);
          myCards && setMyCards(myCards as CardExt[]);
          opponentCards && setOpponentCards(opponentCards);
          setMyDice(myDice);
          setOpponentDice(opponentDice);
          router.push("/game/" + data[0].id);
        } catch (error) {
          //TODO!: handle error
          console.log("error", error);
        }
        //TODO: get game ID, send to both players
      })
      .on("presence", { event: "sync" }, () => {
        !isCancelled &&
          setUsersInLobbyIDs(Object.keys(channel.presenceState()));
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("leave", key, leftPresences);
      })
      .on("broadcast", { event: "game_data" }, ({ payload }) => {
        if (!isCancelled) {
          const {
            gameID,
            player1ID,
            player2ID,
            myCards,
            opponentCards,
            myDice,
            opponentDice,
          } = payload;
          setCurrentGameID(gameID);
          setOpponentID(player1ID);
          setAmIPlayer1(false);
          setMyCards(opponentCards);
          setOpponentCards(myCards);
          setMyDice(opponentDice);
          setOpponentDice(myDice);
          router.push("/game/" + gameID);
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
    setChannel(channel);
    return () => {
      supabase.removeChannel(channel);
      setChannel(null);
    };
  }, []);
  //TODO: what should this return?
  return <div>{}</div>;
}
