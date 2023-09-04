import { myInGameCardsState, opponentInGameCardsState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";
import Card from "@/components/Card";

export default function DeckDisplay() {
  //TODO: view other players' decks
  const myCards = useRecoilValue(myInGameCardsState);
  return (
    <div className="flex bg-blue-500 flex-row flex-wrap gap-4 p-2 w-full">
      {myCards?.map((card) => {
        return <Card key={card.id} card={card} isInDeckDisplay />;
      })}
    </div>
  );
}
