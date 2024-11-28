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
        className={`flex z-20 mr-3 bg-yellow-600/80 hover:bg-yellow-600 text-xl text-slate-100 hover:scale-110 transition-all ring-2 ring-offset-2 hover:ring-offset-4  ring-amber-600/70 rounded-lg w-20 h-20 justify-center items-center
         ${!isCardFrozen && "cursor-pointer"}`}
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
          <span className="text-lg mb-1 font-semibold  flex items-center justify-center">
            {attack?.effectType &&
              attacktypeDisplayText[
                attack.effectType as
                  | "NORMAL_ATTACK"
                  | "ELEMENTAL_SKILL"
                  | "ELEMENTAL_BURST"
              ]}
          </span>

          {/* {Object.entries(attack.cost!)
            .sort()
            .map(([element, amount]) => (
              <div className="text-slate-200" key={element + amount + playerID}>
                <span>
                  {element}:{amount}
                </span>
              </div>
            ))} */}
        </div>
      </div>
    )
  );
}
