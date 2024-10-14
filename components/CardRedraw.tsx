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
  const [amIRedrawing, setAmIRedrawing] = useRecoilState(amIRedrawingState);
  const [selectedCards, setSelectedCards] =
    useRecoilState(mySelectedCardsState);
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
          <div className="flex justify-between w-full ">
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
                setSelectedCards([]);
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
        </div>
      )}
    </div>
  );
}
