import {
  currentGameIDState,
  currentPhaseState,
  currentTurnState,
  gameChannelState,
  myIDState,
  myInGameCardsState,
  opponentIDState,
  opponentInGameCardsState,
  usersInLobbyIDsState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import TurnAndPhase from "./TurnAndPhase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import { use, useEffect } from "react";

interface Props {
  card: Card;
}
const Card = ({ card }: Props) => {
  return (
    <div className="bg-blue-200 flex flex-col items-center w-28">
      <span>{card.name}</span>
      {/* //TODO: use Next.js Image component */}
      <img
        src={card.img_src}
        className="w-full h-12 object-cover object-center"
      />
      <span>{card.card_type}</span>
      <span>{card.faction}</span>
      <span>{card.element}</span>
    </div>
  );
};

//TODO: move to another file
interface PlayerBoardProps {
  playerCards: Card[];
  playerID?: string;
}
const PlayerBoard = ({ playerCards, playerID }: PlayerBoardProps) => {
  const myID = useRecoilValue(myIDState);
  const isMyBoard = playerID === myID;

  return (
    <div
      className={`${
        isMyBoard ? "bg-green-400" : "bg-red-400"
      } grid grid-cols-[5%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_5%] 
    gap-2 w-screen  h-[40vh] p-2`}
    >
      <div className={`${isMyBoard && "order-2"} bg-blue-100 col-span-full`}>
        hand
        {playerCards
          ?.filter((card) => card.location === "HAND")
          .map((card) => (
            <Card key={card.id} card={card} />
          ))}
      </div>
      <div className="bg-yellow-50 h-full">
        deck zone{" "}
        {playerCards.filter((card) => card.location === "DECK").length}
      </div>
      <div className="bg-yellow-50 h-full">
        action zone
        <div className="grid grid-cols-2">
          {/* {playerCards
            ?.filter((card) => card.card_type === "ACTION")
            .map((card) => (
              <Card key={card.id} card={card} />
            ))} */}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        character zone
        <div className="flex flex-row justify-evenly">
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => (
              <Card key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
      <div className="bg-yellow-50 h-full">dice zone</div>
    </div>
  );
};

export default function GameBoard() {
  const myCards = useRecoilValue(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const gameID = useRecoilValue(currentGameIDState);
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);
  const myDeckInGameCards = useRecoilValue(myInGameCardsState);
  const opponentInGameCards = useRecoilValue(opponentInGameCardsState);

  //TODO: move to a separate file again
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

  return (
    <div>
      <PlayerBoard playerCards={opponentCards || []} playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerCards={myCards || []} playerID={myID} />
    </div>
  );
}
