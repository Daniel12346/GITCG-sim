import {
  currentGameIDState,
  currentPlayerIDState,
  myIDState,
  myInGameCardsState,
  opponentIDState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import TurnAndPhase from "./TurnAndPhase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import { use, useEffect, useState } from "react";
type CardT = Card;
import Card from "./Card";
import { RealtimeChannel } from "@supabase/supabase-js";

//TODO: move to another file
interface PlayerBoardProps {
  playerCards: Card[];
  playerID?: string;
}
const PlayerBoard = ({ playerCards, playerID }: PlayerBoardProps) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const isMyBoard = playerID === myID;
  const [opponentInGameCards, setOpponentInGameCards] = useRecoilState(
    opponentInGameCardsState
  );
  const [myInGameCards, setMyInGameCards] = useRecoilState(myInGameCardsState);

  const handleActivateCard = (cardID: string) => () => {
    console.log("card clicked", channel);
    channel?.send({
      type: "broadcast",
      event: "activate_card",
      payload: { cardID },
    });
  };

  useEffect(() => {
    if (!gameID || !myID) return;
    const supabase = createClientComponentClient<Database>();
    const ch = supabase
      //TODO: do I need to make a separate channel for this?
      .channel("game-cards:" + gameID)
      .on(
        "broadcast",
        { event: "activate_card" },
        ({ payload: { card_id } }) => {
          setOpponentInGameCards((prev) => {
            return prev.map((card) => {
              if (card.id === card_id) {
                return { ...card, location: "ACTION" };
              }
              return card;
            });
          });
        }
      )
      .subscribe(async (status) => {
        console.log("subscribed to activate_card", status);
      });
    console.log("EEE", channel);
    setChannel(ch);
    return () => {
      console.log("unsubscribing in activate_card ");
      channel && supabase.removeChannel(channel);
      setChannel(null);
    };
  }, [gameID, myID]);
  return (
    <div
      className={`${
        isMyBoard ? "bg-green-400" : "bg-red-400"
      } grid grid-cols-[5%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_5%] 
    gap-2 w-screen p-2`}
      //TODO: default height
    >
      <div
        className={`${
          isMyBoard && "order-2"
        } bg-blue-100 col-span-full flex flex-row gap-2 justify-center`}
      >
        hand
        {playerCards
          ?.filter((card) => card.location === "HAND")
          .map((card) => (
            <Card
              key={card.id}
              card={card}
              handleClick={() => {
                setMyInGameCards((prev) => {
                  if (!prev) return [];
                  // return prev.map((prevCard) => {
                  //   if (prevCard.id === card.id) {
                  //     return { ...card, location: "ACTION" };
                  //   }
                  //   return card;
                  // });
                  return prev.map((prevCard) => {
                    if (prevCard.id === card.id) {
                      return { ...card, location: "ACTION" };
                    }
                    return prevCard;
                  });
                });

                console.log("card clicked", channel);
                channel?.send({
                  type: "broadcast",
                  event: "activate_card",
                  payload: { card_id: card.id },
                });
              }}
            />
          ))}
      </div>
      <div className="bg-yellow-50 h-full">
        deck zone{" "}
        {playerCards.filter((card) => card.location === "DECK").length}
      </div>
      <div className="bg-yellow-50 h-full">
        action zone
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter((card) => card.location === "ACTION")
            .map((card) => (
              <Card key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        character zone
        <div className="flex flex-row justify-evenly">
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                handleClick={isMyBoard ? handleActivateCard(card.id) : () => {}}
              />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
      <div className="bg-yellow-50 h-full">dice zone</div>
    </div>
  );
};

export default function GameBoard() {
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const gameID = useRecoilValue(currentGameIDState);
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);
  const opponentInGameCards = useRecoilValue(opponentInGameCardsState);
  const [currentPlayer, setcurrentPlayer] =
    useRecoilState(currentPlayerIDState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  //TODO: move to a separate file again
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID }, broadcast: { self: true } },
    });
    //TODO: use
    // setcurrentPlayer(Math.random() > 0.5 ? myID : opponentID);
    console.log("channel", channel);
    channel
      .on("presence", { event: "sync" }, () => {
        console.log("opp. ", opponentInGameCards);
        if (!opponentInGameCards || !opponentInGameCards.length) {
          console.log("sending deck", channel);
          channel.send({
            type: "broadcast",
            event: "share_deck",
            payload: { cards: myCards },
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
    setChannel(channel);
    return () => {
      console.log("unsubscribing");
      supabase.removeChannel(channel);
      setChannel(null);
    };
  }, []);

  return (
    <div>
      <PlayerBoard playerCards={opponentCards || []} playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerCards={myCards || []} playerID={myID} />
    </div>
  );
}
