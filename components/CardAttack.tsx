import {
  currentPhaseState,
  isMyTurnState,
  myInGameCardsState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";

type Props = {
  attack: Effect;
  playerID: string;
  handleAttack: () => void;
};

export default function CardAttackInfo({
  attack,
  playerID,
  handleAttack,
}: Props) {
  const myCards = useRecoilValue(myInGameCardsState);
  const thisCard = myCards.find((card) => card.id === attack.card_id);
  const isCardFrozen = thisCard?.statuses?.find(
    (status) => status.name === "FROZEN"
  );
  const attacktypeDisplayText = {
    NORMAL_ATTACK: "Normal",
    ELEMENTAL_SKILL: "Skill",
    ELEMENTAL_BURST: "Burst",
  };
  const isMyTurn = useRecoilValue(isMyTurnState);
  const currentPhase = useRecoilValue(currentPhaseState);
  // TODO: calculate and display actual cost?
  return (
    currentPhase === "ACTION_PHASE" && (
      <div
        className={`flex bg-indigo-600 rounded-md ring-indigo-400  ring-4
         ${!isCardFrozen && "cursor-pointer"} z-20`}
        onClick={() => {
          if (!isCardFrozen) {
            handleAttack();
          }
        }}
      >
        {/* <p className="text-xs">{attack.name}</p> */}
        <div
          className={`flex flex-col items-center p-2 
            ${isCardFrozen && "opacity-50"}}
          }`}
        >
          <span className="text-lg mb-1 font-semibold">
            {attack?.effectType &&
              attacktypeDisplayText[
                //TODO: is it always one of these 3?
                attack.effectType as
                  | "NORMAL_ATTACK"
                  | "ELEMENTAL_SKILL"
                  | "ELEMENTAL_BURST"
              ]}
          </span>

          {Object.entries(attack.cost!)
            .sort()
            .map(([element, amount]) => (
              <div className="text-slate-200" key={element + amount + playerID}>
                <span>
                  {element}:{amount}
                </span>
              </div>
            ))}
        </div>
      </div>
    )
  );
}
