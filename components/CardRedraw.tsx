import { useRecoilState, useRecoilValue } from "recoil";
import {
  amIRedrawingState,
  currentPhaseState,
  myInGameCardsState,
  mySelectedCardsState,
} from "@/recoil/atoms";
import { drawCards } from "@/app/actions";
import { RealtimeChannel } from "@supabase/supabase-js";
import Card from "./Card";
import { shuffleDeck } from "@/app/utils";
import { useEffect } from "react";

export default function CardRedraw({
  channel,
}: {
  channel: RealtimeChannel | null;
}) {
  const currentPhase = useRecoilValue(currentPhaseState);
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const selectedCards = useRecoilValue(mySelectedCardsState);
  const [amIRedrawing, setAmIRedrawing] = useRecoilState(amIRedrawingState);
  const redrawCards = (myCards: CardExt[], selectedCards: CardExt[]) => {
    const amountToDraw = selectedCards.length;
    const myCardsAfterReturningToDeck = myCards.map((card) => {
      const isSelected = selectedCards.find(
        (selectedCard) => selectedCard.id === card.id
      );
      if (isSelected) {
        return { ...card, location: "DECK" as CardExt["location"] };
      }
      return card;
    });
    const updatedCards = drawCards(
      shuffleDeck(myCardsAfterReturningToDeck),
      amountToDraw
    );
    return updatedCards;
  };
  useEffect(() => {
    if (currentPhase === "PREPARATION_PHASE") {
      setAmIRedrawing(true);
    } else {
      setAmIRedrawing(false);
    }
  }, [currentPhase]);
  //   useEffect(() => {
  //     if (currentPhase === "ROLL_PHASE") {
  //       if (amIPlayer1) {
  //         //resettting dice for both players
  //         const myDice = createRandomDice(8);
  //         const opponentDice = createRandomDice(8);
  //         setMyDice(myDice);
  //         setOpponentDice(opponentDice);
  //         channel &&
  //           broadcastUpdatedCardsAndDice({
  //             channel,
  //             myDice,
  //             opponentDice,
  //           });
  //       }
  //       setAmIRerolling(true);
  //     } else {
  //       setAmIRerolling(false);
  //     }
  //   }, [currentPhase]);
  return (
    <div
      //TODO: center properly
      className="absolute top-[50%]
    left-[50%] -translate-x-1/2 -translate-y-1/2
      flex items-center justify-center z-[100] overflow-hidden pointer-events-none"
    >
      {amIRedrawing && (
        <div className=" border-solid border-4 overflow-hidden pointer-events-auto bg-blue-400 p-4">
          <div className="flex flex-row gap-4">
            {myCards
              .filter((c) => c.location === "HAND")
              .map((card) => (
                <Card key={card.id} card={card} />
              ))}
          </div>
          <button
            onClick={() => {
              const myUpdatedCards = redrawCards(myCards, selectedCards);
              console.log(
                "myUpdatedCards",
                myUpdatedCards,
                myCards,
                selectedCards
              );
              channel &&
                channel.send({
                  type: "broadcast",
                  event: "updated_cards_and_dice",
                  payload: { myCards: myUpdatedCards },
                });
              setMyCards(myUpdatedCards);
            }}
          >
            Redraw
          </button>
          <button
            onClick={() => {
              setAmIRedrawing(false);
            }}
          >
            confirm
          </button>
        </div>
      )}
    </div>
  );
}
