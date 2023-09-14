import { myCurrentDeckState } from "@/recoil/atoms";
import { useRecoilValue, useRecoilValueLoadable } from "recoil";

export default function DeckInfo() {
  const deckLoadable = useRecoilValueLoadable(myCurrentDeckState);
  switch (deckLoadable.state) {
    case "hasValue":
      return (
        <div className="text-slate-200 ">
          <span className="text-lg">{deckLoadable.contents?.name + " "}</span>
          <span className="text-slate-300">
            ({deckLoadable.contents?.deck_card_basic_info.length} cards)
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
