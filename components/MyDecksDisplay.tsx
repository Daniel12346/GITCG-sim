import {
  deckInDeckBuilderCardsState,
  deckInDeckBuilderNameState,
  myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
  myDecksState,
  myCurrentDeckWithCardBasicInfoState,
  myCurrentDeckIDState,
  myIDState,
} from "@/recoil/atoms";
import { useEffect, useState } from "react";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import SelectCurrentDeck from "./SelectCurrentDeck";
import DeckDisplay from "./DeckDisplay";
import { updateMyCurrentDeckInDatabase } from "@/app/utils";
import DeleteDeck from "./DeckDeleteButton";
import { ChevronRight, ChevronUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function MyDecksDisplay() {
  const supabase = createClient();
  const myID = useRecoilValue(myIDState);
  const myCurrentDeckID = useRecoilValue(myCurrentDeckIDState);
  const myDecks = useRecoilValue(myDecksState);
  const myCurrentDeck = useRecoilValue(myCurrentDeckWithCardBasicInfoState);
  const myCurrentDeckLoadable = useRecoilValueLoadable(
    myCurrentDeckWithCardBasicInfoState
  );
  const myCurrentDeckCardsLoadable = useRecoilValueLoadable(
    myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const refreshMyCurrentDeckCards = useRecoilRefresher_UNSTABLE(
    myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const [
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects,
    setDeckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects,
  ] = useRecoilState(
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const setDeckInDeckBuilderName = useSetRecoilState(
    deckInDeckBuilderNameState
  );
  const [isDropwdownOpen, setIsDropdownOpen] = useState(true);
  useEffect(() => {
    setDeckInDeckBuilderName(myCurrentDeck?.name ?? "");
  }, [myCurrentDeck]);

  useEffect(() => {
    if (
      myCurrentDeckCardsLoadable.state === "hasValue" &&
      myCurrentDeckCardsLoadable.contents
    ) {
      setDeckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects(
        myCurrentDeckCardsLoadable.contents
      );
    }
  }, [myCurrentDeckCardsLoadable]);
  useEffect(() => {
    if (myCurrentDeckLoadable && myCurrentDeckLoadable.state === "hasValue") {
      setDeckInDeckBuilderName(myCurrentDeckLoadable.contents?.name ?? "");
    }
  }, [myCurrentDeckLoadable]);

  useEffect(() => {
    updateMyCurrentDeckInDatabase(supabase, myID, myCurrentDeckID).then(() => {
      refreshMyCurrentDeckCards();
    });
  }, [myCurrentDeckID]);

  return (
    <>
      <ul className="mb-6">
        <div
          className="flex text-blue-200 cursor-pointer text-semibold items-center"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
        >
          switch deck{" "}
          <div className="flex font-extrabold items-center ml-1">
            {!isDropwdownOpen ? (
              <ChevronRight size={20} strokeWidth={3} />
            ) : (
              <ChevronUp size={20} strokeWidth={3} />
            )}
          </div>
        </div>
        <div className={`${isDropwdownOpen ? "" : "hidden "}`}>
          {myDecks?.map((deck) => {
            return (
              <div className="flex gap-1 py-1 items-center border-b-2 border-slate-400/60">
                <SelectCurrentDeck key={deck.id} deck={deck} />
                <DeleteDeck key={deck.id} deckID={deck.id} />
              </div>
            );
          })}
        </div>
      </ul>
      {myCurrentDeckCardsLoadable.state === "loading" && (
        <div className="text-slate-300">
          <div className="flex justify-center w-full"></div>
          <span>Loading deck....</span>
        </div>
      )}

      <DeckDisplay
        isEditable
        deckCards={deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects}
      />
    </>
  );
}
