import {
  deckInDeckBuilderCardsState,
  deckInDeckBuilderNameState,
  myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
  myDecksState,
  myCurrentDeckWithCardBasicInfoState,
  myCurrentDeckIDState,
} from "@/recoil/atoms";
import { useEffect } from "react";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import CardInDeckDisplay from "./CardInDeckDisplay";
import SelectCurrentDeck from "./SelectCurrentDeck";

export default function DeckDisplay() {
  //TODO: view other players' decks
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
    refreshMyCurrentDeckCards();
  }, [myCurrentDeckID]);

  const sortDeckCards = (cards: CardBasicInfoWithQuantityAndEffects[]) =>
    cards?.toSorted((a, b) => {
      if (a.card_type === "CHARACTER" && b.card_type !== "CHARACTER") return -1;
      if (b.card_type === "CHARACTER" && a.card_type !== "CHARACTER") return 1;
      return 0;
    });

  return (
    <>
      <ul>
        {myDecks?.map((deck) => {
          return <SelectCurrentDeck key={deck.id} deck={deck} />;
        })}
      </ul>
      {myCurrentDeckCardsLoadable.state === "loading" && (
        <div className="text-slate-300">
          <div className="flex justify-center w-full"></div>
          <span>Loading deck....</span>
        </div>
      )}

      <div className="flex bg-slate-600 flex-row gap-4 justify-evenly flex-wrap rounded-md p-4">
        {sortDeckCards(
          deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects
        ).map((card) => {
          return (
            <CardInDeckDisplay key={card.id} card={card} isInDeck={true} />
          );
        })}
      </div>
    </>
  );
}
