import { usePrevious } from "@/app/utils";
import {
  currentViewedCardState,
  mySelectedCardsState,
  myIDState,
  isMyTurnState,
  currentPhaseState,
  currentHighlightedCardState,
  usedAttackState,
  amIReadyForNextPhaseState,
  currentActiveCharacterState,
  opponentCharacterChangesAfterAttackState,
} from "@/recoil/atoms";
import { ArrowUp } from "lucide-react";
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
  let wasAttacker = usedAttack?.attackerCardID === card.id;
  let wasUsedAttackTarget = usedAttack?.targetCardID === card.id;
  const previousCard = usePrevious(card);
  const [healthChange, setHealthChange] = useState(0);
  const amIReadyForNextPhase = useRecoilValue(amIReadyForNextPhaseState);
  const myActiveCharacter = useRecoilValue(currentActiveCharacterState);
  //TODO!: explicitly define selected attack target (may not be the same as the active character?)
  const isOpponentActiveCharacter = card.is_active && !isMyCard;

  const opponentCharacterChangesAfterAttack = useRecoilValue(
    opponentCharacterChangesAfterAttackState
  );
  const thisCardChangesAfterAttack = opponentCharacterChangesAfterAttack?.find(
    (change) => change.cardID === card.id
  );
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
         ${isDefeated && "border-gray-400 scale-100"}
         rounded-md duration-300 ease-in-out
        ${isSelected && "ring-4 ring-offset-2 ring-blue-300"}
        ${card && card.is_active && "scale-125"}
        ${isHighlighted && "highlight-with-shadow"}
        ${overrideIsFaceDown && "pointer-events-none"}
        ${
          wasAttacker &&
          (isMyCard ? "my-attack-attacker" : "opponent-attack-attacker")
        }
        ${
          wasUsedAttackTarget &&
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
        {card.location === "HAND" &&
          isMyCard &&
          isMyTurn &&
          !amIReadyForNextPhase &&
          //if a player does not control an active character, the only action they can perform is to switch to a new active character
          myActiveCharacter &&
          myActiveCharacter.health !== 0 && (
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
          (!amIReadyForNextPhase ||
            !myActiveCharacter ||
            myActiveCharacter.health === 0) &&
          !card.is_active &&
          ((currentPhase === "ACTION_PHASE" && isMyTurn) ||
            (currentPhase === "PREPARATION_PHASE" && !myActiveCharacter)) && (
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

      {thisCardChangesAfterAttack?.healthChange != undefined && (
        <>
          {isOpponentActiveCharacter && (
            <div className="z-50 absolute -bottom-6 left-0 w-full flex justify-center">
              <ArrowUp
                strokeWidth={4}
                className="w-10 h-10 text-red-400
        animate-bounce duration-1500"
              />
            </div>
          )}
          <div className="z-40 flex justify-center items-center w-full h-full bg-slate-950 bg-opacity-60">
            <span className="text-red-400 font-extrabold text-4xl ">
              {`${thisCardChangesAfterAttack.healthChange}`}
            </span>
          </div>
        </>
      )}
      <div className="z-10 flex justify-between w-full absolute top-0 left-0">
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
      <div className="rounded-sm  z-10 absolute left-0 -top-6 col-re gap-1">
        <div className="flex gap-1">
          {card.statuses
            ?.concat(thisCardChangesAfterAttack?.statusesAdded || [])
            ?.map((status, i) => (
              <div
                key={status.name + i}
                className={`
                    bg-opacity-40
                    ${
                      thisCardChangesAfterAttack?.statusesAdded?.some(
                        (statusAdded) => statusAdded.name === status.name
                      ) && "bg-green-400"
                    }
                    ${
                      thisCardChangesAfterAttack?.statusesRemoved?.some(
                        (statusRemoved) => statusRemoved.name === status.name
                      ) && "bg-red-400"
                    }
                    `}
              >
                <span>
                  <img
                    className="w-4 h-4 "
                    src={`/${status.name.toLowerCase()}.svg`}
                  ></img>
                </span>
                {status.turnsLeft !== undefined &&
                  status.turnsLeft !== null && (
                    <span>: {status.turnsLeft}</span>
                  )}
              </div>
            ))}
        </div>
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
