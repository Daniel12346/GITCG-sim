import { myInGameCardsState, opponentInGameCardsState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";
import Card from "@/components/Card";

export default function DeckDisplay() {
  const myCards = useRecoilValue(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  return (
    <div className="flex bg-orange-400 flex-row flex-wrap gap-4 p-2">
      {myCards?.map((card) => {
        return <Card key={card.id} card={card} />;
      })}
    </div>
  );
}
