import { calculateCostAfterModifiers } from "@/app/utils";
import {
  amIReadyForNextPhaseState,
  currentPhaseState,
  currentRoundState,
  myDiceState,
  myInGameCardsState,
  mySelectedCardsState,
  opponentDiceState,
  summonsState,
} from "@/recoil/atoms";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { AttackDiceDisplay } from "./DiceDisplay";

type Props = {
  attack: Effect;
  playerID: string;
  handleMouseEnter?: () => void;
  handleMouseLeave?: () => void;
  handleAttack: () => void;
};

export default function CardAttackInfo({
  attack,
  playerID,
  handleMouseEnter,
  handleMouseLeave,
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
  const amIReadyForNextPhase = useRecoilValue(amIReadyForNextPhaseState);

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
          attackerCard: thisCard,
          attackBaseEffectID: attack.effect_basic_info_id,
        },
        targetCards,
      },
    },
  });
  return (
    currentPhase === "ACTION_PHASE" &&
    !amIReadyForNextPhase && (
      <div
        onMouseEnter={() => {
          handleMouseEnter && handleMouseEnter();
        }}
        onMouseLeave={() => {
          handleMouseLeave && handleMouseLeave();
        }}
        className={`flex cursor-pointer flex-col justify-between z-20 mr-3 bg-yellow-600/80 hover:bg-yellow-600 text-xl text-slate-100 hover:scale-110 transition-all ring-2 ring-offset-2 hover:ring-offset-4  ring-amber-600/70 rounded-lg w-20 h-20 items-center py-2
         ${
           isCardFrozen ||
           (attack.effectType === "ELEMENTAL_BURST" &&
             (thisCard?.max_energy || 0) > (thisCard?.energy || 0) &&
             "cursor-none opacity-50")
         }`}
        onClick={() => {
          if (!isCardFrozen) {
            handleAttack();
          }
        }}
      >
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
        </div>
      </div>
    )
  );
}
