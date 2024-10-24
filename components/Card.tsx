import { addCardBasicInfoToDeck, removeBasicInfoFromDeck } from "@/app/utils";
import {
  currentViewedCardState,
  myCurrentDeckIDState,
  mySelectedCardsState,
  myIDState,
  currentGameIDState,
  isMyTurnState,
  currentPhaseState,
  myCurrentDeckWithCardBasicInfoState,
  myCurrentDeckCardCountState,
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
  creationDisplayElements?: (React.JSX.Element | null)[];
}
export default function Card({
  card,
  handleClick,
  isInDeckDisplay,
  equippedCards,
  creationDisplayElements,
}: Props) {
  const [selectedTargets, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  const currentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const currentDeckCardCount = useRecoilValue(myCurrentDeckCardCountState);
  const refreshDeck = useRecoilRefresher_UNSTABLE(
    myCurrentDeckWithCardBasicInfoState
  );
  const myID = useRecoilValue(myIDState);
  const isMyCard = card.owner_id === myID;
  const isSelected = selectedTargets.find((target) => target.id === card.id);
  const isFaceDown = card.location === "HAND" && !isMyCard;
  const isFrozen = card.statuses?.find((status) => status.name === "FROZEN");
  const isDefeated = card.location === "CHARACTER" && card.health === 0;
  const isSummon = card.location === "SUMMON";
  const gameID = useRecoilValue(currentGameIDState);
  const isInGame = !!gameID;
  const isMyTurn = useRecoilValue(isMyTurnState);
  const currentPhase = useRecoilValue(currentPhaseState);
  const isDeckFull = currentDeckCardCount >= 33;

  return (
    <div
      className={`group bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 
         ${isDefeated && "border-gray-400"}
         rounded-md transition-transform duration-300 ease-in-out
        ${isSelected && "ring-4 ring-blue-600"}
        ${card && card.is_active && "scale-125"}
  ${isInDeckDisplay && card.card_type === "CHARACTER" && "scale-125 mx-2"}
        `}
      onMouseEnter={() => {
        console.log(card);
        setCurrentViewedCard(card);
      }}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full z-10 bg-blue-200 opacity-0
          ${isFrozen && "opacity-60 bg-blue-500"}
          ${isDefeated && "opacity-80 bg-gray-500"}
          `}
      ></div>
      <div className="z-10 flex justify-between w-full">
        {creationDisplayElements?.map((element) => element)}
      </div>
      {/* used for activating cards from hand */}
      <>
        {card.location === "HAND" && isMyCard && isMyTurn && (
          <span
            className="z-30 cursor-pointer hidden group-hover:block absolute top-1 left-1 bg-green-200 text-green-800 p-1"
            onClick={handleClick}
          >
            activate
          </span>
        )}

        {/* used for switching active character */}
        {card.location === "CHARACTER" &&
          isMyCard &&
          !card.is_active &&
          isMyTurn && (
            <span
              className="z-30 cursor-pointer hidden group-hover:block absolute top-1 left-1 bg-green-200 text-green-800 p-1"
              onClick={handleClick}
            >
              switch
            </span>
          )}
        {/* used for selecting cards */}
        {/* only my cards can be selected outside the action phase*/}
        {isInGame && (currentPhase !== "ACTION_PHASE" ? isMyCard : true) && (
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
        )}
      </>
      {isSummon && (
        <div className="z-10 flex justify-between w-full">
          <span className="bg-blue-600 rounded-sm text-blue-100  -mr-1 ">
            {card.usages}
          </span>
        </div>
      )}
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
                        isEnergyUsed
                          ? "bg-amber-300"
                          : "bg-slate-100 opacity-90"
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
            className={`bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer
              ${isDeckFull && "opacity-50 pointer-events-none"}
              `}
            onClick={async () => {
              await addCardBasicInfoToDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
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
