import {
  myInGameCardsState,
  opponentInGameCardsState,
  myCurrentDeckCardsBasicInfoState,
} from "@/recoil/atoms";
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

  return (
    <div className="flex bg-slate-600 flex-row gap-3 justify-evenly flex-wrap rounded-md p-3">
      {myDeckCards?.map((card) => {
        return <Card key={card.id} card={card} isInDeckDisplay />;
      })}
    </div>
  );
}
