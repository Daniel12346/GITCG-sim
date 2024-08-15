import { addCardBasicInfoToDeck, removeBasicInfoFromDeck } from "@/app/utils";
import {
  currentViewedCardState,
  myCurrentDeckCardsBasicInfoState,
  myCurrentDeckIDState,
  mySelectedCardsState,
  myIDState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";

interface Props {
  card: CardExt;
  handleClick?: () => void;
  isInDeckDisplay?: boolean;
  equippedCards?: CardExt[];
}
export default function Card({
  card,
  handleClick,
  isInDeckDisplay,
  equippedCards,
}: Props) {
  const [selectedTargets, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  const currentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const refreshDeck = useRecoilRefresher_UNSTABLE(
    myCurrentDeckCardsBasicInfoState
  );
  const myID = useRecoilValue(myIDState);
  const isMyCard = card.owner_id === myID;
  const isSelected = selectedTargets.find((target) => target.id === card.id);
  const isFaceDown = card.location === "HAND" && !isMyCard;
  const isFrozen = card.statuses?.find((status) => status.name === "FROZEN");
  return (
    <div
      className={`group bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 rounded-md transition-transform duration-300 ease-in-out
        ${isSelected && "ring-4 ring-blue-600"}
        ${card && card.is_active && "scale-125"}
        `}
      onMouseEnter={() => {
        setCurrentViewedCard(card);
      }}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full z-10 bg-blue-200 opacity-0
          ${isFrozen && "opacity-60 bg-blue-500"}
          `}
      ></div>
      {/* used for activating cards from hand */}
      {card.location === "HAND" && isMyCard && (
        <span
          className="z-30 cursor-pointer hidden group-hover:block absolute top-1 left-1 bg-green-200 text-green-800 p-1"
          onClick={handleClick}
        >
          activate
        </span>
      )}
      {/* used for switching active character */}
      {card.location === "CHARACTER" && isMyCard && !card.is_active && (
        <span
          className="z-30 cursor-pointer hidden group-hover:block absolute top-1 left-1 bg-green-200 text-green-800 p-1"
          onClick={handleClick}
        >
          switch
        </span>
      )}
      {/* used for selecting cards */}
      <span
        className="z-30 cursor-pointer hidden group-hover:block absolute top-10 left-1 bg-slate-200 text-blue-800 p-1"
        onClick={() => {
          setSelectedTargets((prev) => {
            if (prev.find((target) => target.id === card.id)) {
              return prev.filter((target) => target.id !== card.id);
            } else {
              return [...prev, card];
            }
          });
        }}
      >
        {isSelected ? "deselect" : "select"}
      </span>
      {/* health */}
      <div className="z-10 flex justify-between w-full">
        <span className="bg-orange-300 rounded-sm text-orange-800 -ml-1 ">
          {isInDeckDisplay ? card.base_health : card.health}
        </span>
      </div>
      {/* energy */}
      <div className="z-10 absolute h-full w-2 top-0 right-0">
        {card.energy !== null && (
          <div className="flex flex-col rounded-sm gap-2 items-center text-orange-300 -mr-1">
            {card.max_energy &&
              Array.from({ length: card.max_energy }).map((_, i) => {
                const isEnergyUsed = i < card.energy!;
                return (
                  <div className="flex flex-col gap-1 justify-center">
                    <span
                      className={`${
                        isEnergyUsed ? "bg-amber-300" : "bg-slate-100 opacity-90"
                      }  w-2  h-2  outline-orange-600 outline-double outline-2
                    rounded-full
                    `}
                    ></span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* statuses */}
      <div className="bg-orange-100 rounded-sm text-blue-800">
        {card.statuses?.map((status) => (
          //TODO: use unique key
          <span>
            {status.name}: {status.turnsLeft}
          </span>
        ))}
      </div>
      {
        //only used in deck builder
      }
      {isInDeckDisplay && (
        <div className="z-10 flex justify-center w-full bottom-[-10px] absolute ">
          <span
            className="bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer"
            onClick={async () => {
              await addCardBasicInfoToDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
              //TODO: set new value on cardsBasicInfoState
              refreshDeck();
            }}
          >
            +
          </span>
          <span
            className="bg-slate-200 px-0.5 text-red-800 h-fit font-extrabold cursor-pointer"
            onClick={async () => {
              await removeBasicInfoFromDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
              refreshDeck();
            }}
          >
            -
          </span>
          <span className="bg-slate-200 px-0.5 text-indigo-900 font-semibold">
            {card.quantity}
          </span>
        </div>
      )}
      {/* //TODO: use Next.js Image component */}
      <img
        src={!isFaceDown ? card.img_src : "../card_back_origin.webp"}
        className={`w-full absolute h-full object-cover object-center rounded-md`}
      />
      {equippedCards && equippedCards.length > 0 && (
        <div className="flex gap-1 z-20 absolute">
          {equippedCards.map((equippedCard) => (
            <div className="scale-50">
              {/* //TODO: use unique key */}
              <Card key={equippedCard.id} card={equippedCard} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
