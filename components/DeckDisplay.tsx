import { myCurrentDeckCardsBasicInfoState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";
import { cardFromBasicInfo } from "@/app/utils";
import CardInDeckDisplay from "./CardInDeckDisplay";

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
    <div className="flex bg-slate-600 flex-row gap-4 justify-evenly flex-wrap rounded-md p-4">
      {sortedDeckCards?.map((card) => {
        return <CardInDeckDisplay key={card.id} card={card} isInDeck={true} />;
      })}
    </div>
  );
}
