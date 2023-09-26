import { myCurrentDeckState } from "@/recoil/atoms";
import { useRecoilValue, useRecoilValueLoadable } from "recoil";

export default function DeckInfo() {
  const deckLoadable = useRecoilValueLoadable(myCurrentDeckState);
  const deckCardBasicInfoTotalCards =
    deckLoadable.contents?.deck_card_basic_info?.length &&
    deckLoadable.contents?.deck_card_basic_info
      .map((deckCardBasicInfo: any) => deckCardBasicInfo.quantity)
      .reduce((a: number, b: number) => a + b, 0);

  switch (deckLoadable.state) {
    case "hasValue":
      return (
        <div className="text-slate-200 ">
          <span>{deckLoadable.contents?.name + " "}</span>
          <span className="text-slate-300">
            ({deckCardBasicInfoTotalCards} cards)
          </span>
        </div>
      );
    case "loading":
      return (
        <div className="text-slate-300">
          <div className="flex justify-center w-full"></div>
          <span>Loading deck....</span>
        </div>
      );
    case "hasError":
      return (
        <div className="text-slate-300">
          <div className="flex justify-center w-full"></div>
          <span>Deck not found!</span>
        </div>
      );
  }
}
