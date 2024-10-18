import { myCurrentDeckCardsBasicInfoState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";
import Card from "@/components/Card";
import { cardFromBasicInfo } from "@/app/utils";

export default function DeckDisplay() {
  //TODO: view other players' decks

  const myDeckCardsBasicInfo = useRecoilValue(myCurrentDeckCardsBasicInfoState);
  const myDeckCards = myDeckCardsBasicInfo?.map((card) => {
    return cardFromBasicInfo(card);
  });
  useEffect(() => {
    console.log("myDeckCardsBasicInfo", myDeckCardsBasicInfo);
    // const
  }, [myDeckCardsBasicInfo]);

  const sortedDeckCards = myDeckCards?.sort((a, b) => {
    if (a.card_type === "CHARACTER" && b.card_type !== "CHARACTER") return -1;
    if (b.card_type === "CHARACTER" && a.card_type !== "CHARACTER") return 1;
    return 0;
  });
  return (
    <div className="flex bg-slate-600 flex-row gap-4 justify-evenly flex-wrap rounded-md p-3">
      {sortedDeckCards?.map((card) => {
        return <Card key={card.id} card={card} isInDeckDisplay />;
      })}
    </div>
  );
}
