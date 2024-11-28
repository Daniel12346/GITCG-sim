import { calculateCostAfterModifiers } from "@/app/utils";
import {
  currentPhaseState,
  currentRoundState,
  myDiceState,
  myInGameCardsState,
  mySelectedCardsState,
  opponentDiceState,
  summonsState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import { AttackDiceDisplay } from "./DiceDisplay";
import { useEffect } from "react";

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
  const opponentCards = useRecoilValue(myInGameCardsState);
  const targetCards = useRecoilValue(mySelectedCardsState);
  const thisCard = myCards.find((card) => card.id === attack.card_id);
  const isCardFrozen = thisCard?.statuses?.find(
    (status) => status.name === "FROZEN"
  );
  const attackTypeDisplayText = {
    NORMAL_ATTACK: "Normal",
    ELEMENTAL_SKILL: "Skill",
    ELEMENTAL_BURST: "Burst",
  };
  const myDice = useRecoilValue(myDiceState);
  const summons = useRecoilValue(summonsState);
  const currentRound = useRecoilValue(currentRoundState);
  const opponentDice = useRecoilValue(opponentDiceState);
  const currentPhase = useRecoilValue(currentPhaseState);
  useEffect(() => {
    console.log("thisc", thisCard);
  }, [thisCard]);
  // TODO: calculate and display actual cost?
  const { modifiedCost } = calculateCostAfterModifiers({
    baseCost: attack.cost ?? {},
    executeArgs: {
      playerID,
      myCards,
      opponentCards,
      targetCards,
      myDice,
      currentRound,
      summons,
      opponentDice,
      triggerContext: {
        eventType: "ATTACK",
        attack: {
          attackBaseEffectID: attack.id,
        },
      },
    },
  });
  const maxEnergy = thisCard?.max_energy;
  return (
    currentPhase === "ACTION_PHASE" && (
      <div>
        <div
          className={`flex flex-col justify-between z-20 mr-3 bg-yellow-600/80 hover:bg-yellow-600 text-xl text-slate-100 hover:scale-110 transition-all ring-2 ring-offset-2 hover:ring-offset-4  ring-amber-600/70 rounded-lg w-20 h-20 items-center py-2
         ${!isCardFrozen && "cursor-pointer"}`}
          onClick={() => {
            if (!isCardFrozen) {
              handleAttack();
            }
          }}
        >
          {/* <p className="text-xs">{attack.name}</p> */}
          <div
            className={`flex flex-col items-center   
            ${isCardFrozen && "opacity-50"}}
          }`}
          >
            <span className="text-lg mb-1 font-semibold  flex items-center justify-center">
              {attack?.effectType &&
                attackTypeDisplayText[
                  attack.effectType as
                    | "NORMAL_ATTACK"
                    | "ELEMENTAL_SKILL"
                    | "ELEMENTAL_BURST"
                ]}
            </span>
          </div>
          <div className="w-full flex justify-center">
            <AttackDiceDisplay dice={modifiedCost ?? {}} isMyBoard={true} />
            {/* {attack?.effectType === "ELEMENTAL_BURST" && maxEnergy && (
            <RequiredEnergyDisplay energy={maxEnergy} />
          )} */}
          </div>
        </div>
      </div>
    )
  );
}
