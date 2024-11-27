import { cardFromBasicInfo } from "@/app/utils";
import {
  currentViewedCardState,
  deckInDeckBuilderCardCountState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

interface Props {
  card: CardBasicInfo & {
    //only the cards in the deck have a quantity, the cards in the search results don't
    quantity?: number;
    effect_basic_info: EffectBasicInfo[];
  };
  isInDeck?: boolean;
  isQuantityEditable?: boolean;
}
export default function CardInDeckDisplay({
  card,
  isInDeck,
  isQuantityEditable = false,
}: Props) {
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  // const deckInDeckBuilderCards = useRecoilValue(deckInDeckBuilderCardsState);
  const setDeckInDeckBuilderCardsBasicInfoExtended = useSetRecoilState(
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const deckInDeckBuilderCardCount = useRecoilValue(
    deckInDeckBuilderCardCountState
  );
  const isDeckFull = deckInDeckBuilderCardCount >= 33;

  return (
    <div
      className={`group bg-blue-200 rounded-md flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 
   
      ${card.card_type === "CHARACTER" && isInDeck && "scale-125 mx-2"}`}
      onMouseEnter={() => {
        setCurrentViewedCard(cardFromBasicInfo(card));
      }}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full z-10 bg-blue-200 opacity-0
   
          `}
      ></div>

      <div className="z-10 flex justify-between w-full">
        <span className="bg-orange-300 rounded-sm text-orange-800 -ml-1 ">
          {card.base_health}
        </span>
      </div>
      {/* energy */}
      <div className="z-10 absolute h-full w-2 top-0 right-0">
        {card.max_energy !== null && (
          <div className="flex flex-col rounded-sm gap-2 items-center text-orange-300 -mr-1">
            {card.max_energy &&
              Array.from({ length: card.max_energy }).map((_, i) => {
                return (
                  <div className="flex flex-col gap-1 justify-center">
                    <span
                      className={`bg-orange-200 w-2  h-2  outline-orange-600 outline-double outline-2
                    rounded-full
                    `}
                    ></span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <div className="z-10 flex justify-center w-full bottom-[-10px] absolute ">
        {isQuantityEditable && (
          <>
            {(isInDeck ? card.card_type !== "CHARACTER" : true) && (
              <span
                className={`bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer
              ${
                (isDeckFull || card.quantity === 4) &&
                "opacity-50 pointer-events-none"
              }
              `}
                onClick={() => {
                  //increase quantity of card in deck
                  setDeckInDeckBuilderCardsBasicInfoExtended((prev) => {
                    const deckIncludesCard = prev.find(
                      (cardInDeck) => cardInDeck.id === card.id
                    );
                    return deckIncludesCard
                      ? prev.map((cardInDeck) => {
                          if (cardInDeck.id === card.id) {
                            return {
                              ...cardInDeck,
                              quantity: cardInDeck.quantity + 1,
                            };
                          }
                          return cardInDeck;
                        })
                      : [...prev, { ...card, quantity: 1 }];
                  });
                }}
              >
                +
              </span>
            )}
            <span
              className="bg-slate-200 px-0.5 text-red-800 h-fit font-extrabold cursor-pointer"
              onClick={() => {
                //decrease quantity of card in deck
                setDeckInDeckBuilderCardsBasicInfoExtended((prev) => {
                  return prev
                    .map((cardInDeck) => {
                      const newQuantity = cardInDeck.quantity - 1;
                      if (cardInDeck.id === card.id) {
                        return { ...cardInDeck, quantity: newQuantity };
                      }
                      return cardInDeck;
                    })
                    .filter((cardInDeck) => {
                      return cardInDeck.quantity > 0;
                    });
                });
              }}
            >
              -
            </span>
          </>
        )}
        <span className="bg-slate-200 px-0.5 text-indigo-900 font-semibold">
          {card.quantity}
        </span>
      </div>

      {/* //TODO: use Next.js Image component */}
      <img
        src={card.img_src}
        className={`w-full absolute h-full object-cover object-center rounded-md`}
      />
    </div>
  );
}
