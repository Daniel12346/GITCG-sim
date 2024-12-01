import {
  deckInDeckBuilderCardCountState,
  deckInDeckBuilderNameState,
  deckInDeckBuilderWithCardBasicInfoState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useRecoilValueLoadable } from "recoil";
import DeckSaveButton from "./DeckSaveButton";
import DeckDeleteButton from "./DeckDeleteButton";

export default function DeckInfo() {
  const deckLoadable = useRecoilValueLoadable(
    deckInDeckBuilderWithCardBasicInfoState
  );
  const deckCardBasicInfoTotalCards = useRecoilValue(
    deckInDeckBuilderCardCountState
  );
  const [deckName, setDeckName] = useRecoilState(deckInDeckBuilderNameState);

  switch (deckLoadable.state) {
    case "hasValue":
      return (
        <div className="text-slate-200 flex gap-1">
          <span>
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
          <input
            className="bg-transparent border-b-[1.75px]  border-blue-100 border-opacity-70 text-slate-200 mx-1"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          ></input>
          <div className="flex items-center gap-2">
            <DeckSaveButton />
          </div>
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
