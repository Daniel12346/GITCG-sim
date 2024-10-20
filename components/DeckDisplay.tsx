import {
  deckInDeckBuilderCardsState,
  deckInDeckBuilderNameState,
  myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
  myDecksState,
  CardBasicInfoWithQuantityAndEffects,
  myCurrentDeckWithCardBasicInfoState,
} from "@/recoil/atoms";
import { useEffect } from "react";
import {
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import CardInDeckDisplay from "./CardInDeckDisplay";
import SetCurrentDeck from "./SelectCurrentDeck";

export default function DeckDisplay() {
  //TODO: view other players' decks
  const myDecks = useRecoilValue(myDecksState);
  const myCurrentDeckLoadable = useRecoilValueLoadable(
    myCurrentDeckWithCardBasicInfoState
  );
  const myCurrentDeckCardsLoadable = useRecoilValueLoadable(
    myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const setDeckInDeckBuilderName = useSetRecoilState(
    deckInDeckBuilderNameState
  );
  const [
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects,
    setDeckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects,
  ] = useRecoilState(
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
  );

  useEffect(() => {
    myCurrentDeckCardsLoadable.state === "hasValue" &&
      myCurrentDeckCardsLoadable.contents &&
      setDeckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffects(
        myCurrentDeckCardsLoadable.contents
      );
    console.log(myCurrentDeckCardsLoadable.contents);
  }, [myCurrentDeckCardsLoadable]);
  useEffect(() => {
    myCurrentDeckLoadable &&
      myCurrentDeckCardsLoadable.state === "hasValue" &&
      setDeckInDeckBuilderName(myCurrentDeckLoadable.contents?.name ?? "");
  }, [myCurrentDeckLoadable]);

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
          return <SetCurrentDeck key={deck.id} deck={deck} />;
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
