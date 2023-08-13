import {
  myCurrentDeckCardsBasicInfoState,
  myCurrentDeckIDState,
} from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";

export default function CurrentDeckDisplay() {
  const myCurrentDeck = useRecoilValue(myCurrentDeckCardsBasicInfoState);
  return (
    <div>
      current deck:
      <div>
        {myCurrentDeck?.map((card) => (
          <span key={card.id}>{card.name}</span>
        ))}
      </div>
    </div>
  );
}
