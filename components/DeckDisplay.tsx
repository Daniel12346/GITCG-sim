import CardInDeckDisplay from "./CardInDeckDisplay";

type Props = {
  deckCards: CardBasicInfoWithQuantityAndEffects[];
  isEditable?: boolean;
};
export default function DeckDisplay({ deckCards, isEditable }: Props) {
  const sortDeckCards = (cards: CardBasicInfoWithQuantityAndEffects[]) =>
    cards?.toSorted((a, b) => {
      if (a.card_type === "CHARACTER" && b.card_type !== "CHARACTER") return -1;
      if (b.card_type === "CHARACTER" && a.card_type !== "CHARACTER") return 1;
      return 0;
    });
  return (
    <div className="flex bg-blue-300/30 flex-row gap-4 justify-evenly flex-wrap rounded-md p-4">
      {sortDeckCards(deckCards).map((card) => {
        return (
          <CardInDeckDisplay
            key={card.id}
            card={card}
            isInDeck={true}
            isQuantityEditable={isEditable}
          />
        );
      })}
    </div>
  );
}
