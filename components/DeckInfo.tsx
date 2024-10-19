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
        <div className="text-slate-200 flex gap-1">
          <span>
            <span>{deckLoadable.contents?.name + " "}</span>
            <span
              className={`${
                deckCardBasicInfoTotalCards === 33
                  ? "text-slate-300"
                  : "text-red-300"
              }`}
            >
              ({deckCardBasicInfoTotalCards} cards)
            </span>
          </span>
          <button
            className={`${
              deckCardBasicInfoTotalCards !== 33 &&
              "opacity-50 pointer-events-none bg-red-100 text-red-900"
            }
            bg-green-200 ml-4 text-green-800 px-1 cursor-pointer font-semibold rounded-sm text-center`}
            onClick={
              () => {}
              // TODO:
            }
          >
            save
          </button>
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
