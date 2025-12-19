import { cn } from "@/lib/utils";
import {
  mySelectedCardsState,
  myIDState,
  isMyTurnState,
  currentPhaseState,
  amIReadyForNextPhaseState,
  currentActiveCharacterState,
  isCardViewOpenState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

export default function CardInGameOptions({
  card,
  handleClick,
}: {
  card: CardExt;
  handleClick: () => void;
}) {
  const [selectedTargets, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);
  const myID = useRecoilValue(myIDState);
  const isMyCard = card.owner_id === myID;
  const isSelected = selectedTargets.find((target) => target.id === card.id);
  const isMyTurn = useRecoilValue(isMyTurnState);
  const currentPhase = useRecoilValue(currentPhaseState);
  const amIReadyForNextPhase = useRecoilValue(amIReadyForNextPhaseState);
  const myActiveCharacter = useRecoilValue(currentActiveCharacterState);
  const isCardViewOpen = useSetRecoilState(isCardViewOpenState);
  return (
    <div className="z-20 hidden group-hover:flex absolute  gap-0.5 top-0 left-8 w-fit h-full  flex-col">
      {/* used for activating cards from hand */}
      {card.location === "HAND" &&
        isMyCard &&
        isMyTurn &&
        !amIReadyForNextPhase &&
        //if a player does not control an active character, the only action they can perform is to switch to a new active character
        myActiveCharacter &&
        myActiveCharacter.health !== 0 && (
          <span
            className="z-30 cursor-pointer top-1 left-1 bg-green-200 text-green-800 p-1"
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
            className={cn(
              "z-30 cursor-pointer top-20 left-8  bg-green-200 text-green-800 px-0.5 md:p-1"
            )}
            onClick={handleClick}
          >
            switch
          </span>
        )}
      {/* used for selecting cards */}
      {/* only my cards can be selected outside the action phase*/}
      {(currentPhase !== "ACTION_PHASE" ? isMyCard : true) && (
        <span
          className={cn(
            "z-30 cursor-pointer top-10 left-8 bg-slate-200 text-blue-800 px-0-5 md:p-1"
          )}
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
      <span
        className={cn(
          "z-30 cursor-pointer md:hidden -top-1 left-8 bg-slate-200 text-blue-800 px-0.5 md:p-1"
        )}
        onClick={() => isCardViewOpen(true)}
      >
        view
      </span>
    </div>
  );
}
