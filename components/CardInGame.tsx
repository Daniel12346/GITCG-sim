import { usePrevious } from "@/app/utils";
import {
  currentViewedCardState,
  mySelectedCardsState,
  myIDState,
  isMyTurnState,
  currentPhaseState,
  currentHighlightedCardState,
  usedAttackState,
} from "@/recoil/atoms";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

interface Props {
  card: CardExt;
  handleClick?: () => void;
  isInDeckDisplay?: boolean;
  equippedCards?: CardExt[];
  creationDisplayElements?: (React.JSX.Element | null)[];
  overrideIsFaceDown?: boolean;
}
export default function CardInGame({
  card,
  handleClick,
  isInDeckDisplay,
  equippedCards,
  creationDisplayElements,
  overrideIsFaceDown = false,
}: Props) {
  const [selectedTargets, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  const myID = useRecoilValue(myIDState);
  const highlightedCard = useRecoilValue(currentHighlightedCardState);

  const isMyCard = card.owner_id === myID;
  const isSelected = selectedTargets.find((target) => target.id === card.id);
  const isFaceDown =
    overrideIsFaceDown || (card.location === "HAND" && !isMyCard);
  const isHighlighted = highlightedCard?.id === card.id;
  const isFrozen = card.statuses?.find((status) => status.name === "FROZEN");
  const isDefeated = card.location === "CHARACTER" && card.health === 0;
  const isSummon = card.location === "SUMMON";
  const isMyTurn = useRecoilValue(isMyTurnState);
  const currentPhase = useRecoilValue(currentPhaseState);
  const usedAttack = useRecoilValue(usedAttackState);
  let isAttacker = usedAttack?.attackerCardID === card.id;
  let isAttackTarget = usedAttack?.targetCardID === card.id;
  const previousCard = usePrevious(card);
  const [healthChange, setHealthChange] = useState(0);
  useEffect(() => {
    if (
      previousCard &&
      previousCard.id === card.id &&
      card.health !== null &&
      previousCard.health !== null
    ) {
      const change = card.health - previousCard.health;
      setHealthChange(change);
      setTimeout(() => {
        setHealthChange(0);
      }, 200);
    }
  }, [card]);

  return (
    <div
      className={`
       group  transition-transform bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 
         ${isDefeated && "border-gray-400"}
         rounded-md duration-300 ease-in-out
        ${isSelected && "ring-4 ring-offset-2 ring-blue-300"}
        ${card && card.is_active && "scale-125"}
        ${isHighlighted && "highlight-with-shadow"}
        ${overrideIsFaceDown && "pointer-events-none"}
        ${
          isAttacker &&
          (isMyCard ? "my-attack-attacker" : "opponent-attack-attacker")
        }
        ${
          isAttackTarget &&
          (isMyCard ? "opponent-attack-target" : "my-attack-target")
        }
        `}
      onMouseEnter={() => {
        if (isFaceDown) return;
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
          !card.is_active && [
            (currentPhase === "ACTION_PHASE" && isMyTurn) ||
              currentPhase === "PREPARATION_PHASE",
          ] && (
            <span
              className="z-30 cursor-pointer hidden group-hover:block absolute top-1 left-1 bg-green-200 text-green-800 p-1"
              onClick={handleClick}
            >
              switch
            </span>
          )}
        {/* used for selecting cards */}
        {/* only my cards can be selected outside the action phase*/}
        {(currentPhase !== "ACTION_PHASE" ? isMyCard : true) && (
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
            {card.max_usages! - card.usages!}
          </span>
        </div>
      )}
      <div className="z-10 flex justify-between w-full">
        <span
          className={`bg-orange-300 transition-all rounded-sm text-orange-800 -ml-1 
        ${healthChange > 0 && "scale-125 bg-green-800 text-green-200"}
        ${healthChange < 0 && "scale-125 bg-red-800 text-red-200"}
        `}
        >
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
      <div className="rounded-sm text-blue-800 z-10 absolute left-0 flex gap-1">
        {card.statuses?.map((status, i) => (
          <div key={status.name + i}>
            <span>
              <img
                className="w-4 h-4 ml-2"
                src={`/${status.name.toLowerCase()}.svg`}
              ></img>
            </span>
            {status.turnsLeft !== undefined && status.turnsLeft !== null && (
              <span>: {status.turnsLeft}</span>
            )}
          </div>
        ))}
      </div>

      {/* //TODO: use Next.js Image component */}
      <img
        src={!isFaceDown ? card.img_src : "../card_back_origin.png"}
        className={`w-full absolute h-full object-cover object-center rounded-md`}
      />
      {equippedCards && equippedCards.length > 0 && (
        <div className="flex gap-1 z-20 absolute">
          {equippedCards.map((equippedCard) => (
            <div className="scale-50">
              {/* //TODO: use unique key */}
              <CardInGame key={equippedCard.id} card={equippedCard} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
