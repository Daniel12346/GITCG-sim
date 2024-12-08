import {
  currentActiveCharacterState,
  currentPhaseState,
  mySelectedDiceState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";
import ElementalTuning from "./ElementalTuning";
import { RealtimeChannel } from "@supabase/supabase-js";
import RequiredEnergyDisplay from "./RequiredEnergyDisplay";

type DiceDisplayProps = {
  dice: Dice;
  channel?: RealtimeChannel | null;
  isMyBoard: boolean;
  withElementalTuning?: boolean;
  isMain?: boolean;
  displayDiceSelection?: boolean;
};

const Die = ({
  element,
  isMyBoard,
  isSelected,
  size,
}: {
  element: DieElementName;
  isMyBoard: boolean;
  isSelected: boolean;
  size?: number;
}) => {
  const [selectedDice, setSelectedDice] = useRecoilState(mySelectedDiceState);
  const handleSelectDie = () => {
    if (!isMyBoard) return;
    if (isSelected) {
      if (!selectedDice[element]) return;
      setSelectedDice((prev) => {
        let newDice = { ...prev };
        newDice[element] = newDice[element]! - 1;
        return newDice;
      });
    } else {
      setSelectedDice((prev) => {
        let newDice = { ...prev };
        newDice[element] = newDice[element] ? newDice[element] + 1 : 1;
        return newDice;
      });
    }
  };

  return (
    <img
      key={element + isMyBoard}
      onClick={handleSelectDie}
      className={`w-${size} h-${size} cursor-pointer ${
        isMyBoard && isSelected && "ring-2 ring-yellow-200 stroke-none"
      }`}
      src={`/${element.toLowerCase()}_die.svg`}
    />
  );
};

export const DiceOfElement = ({
  element,
  amount,
  isMyBoard,
  dieSize,
  displayDiceSelection = false,
}: {
  element: DieElementName;
  amount: number;
  isMyBoard: boolean;
  dieSize: number;
  displayDiceSelection: boolean;
}) => {
  const selectedDice = useRecoilValue(mySelectedDiceState);
  const amountSelected = selectedDice[element] || 0;
  return Array.from({ length: amount }).map((_, i) => {
    const isSelected = i < amountSelected;
    return (
      <Die
        size={dieSize}
        element={element}
        isMyBoard={isMyBoard}
        isSelected={displayDiceSelection && isSelected}
      />
    );
  });
};

export default function DiceDisplay({
  dice,
  isMyBoard,
  channel,
  withElementalTuning,
  isMain,
  displayDiceSelection,
}: DiceDisplayProps) {
  const currentPhase = useRecoilValue(currentPhaseState);
  return (
    <div className={`${!isMyBoard && "pt-3"} h-full`}>
      {withElementalTuning && isMyBoard && currentPhase === "ACTION_PHASE" && (
        <ElementalTuning channel={channel || null} />
      )}
      <ul
        className={`flex gap-2 flex-wrap p-3 h-full
        ${isMain && "p-0 overflow-y-scroll"}`}
      >
        {Object.entries(dice)
          .toSorted()
          .map(([element, amount]) => (
            <DiceOfElement
              element={element as DieElementName}
              amount={amount}
              isMyBoard={isMyBoard}
              dieSize={8}
              displayDiceSelection={displayDiceSelection || !!isMain}
            />
          ))}
      </ul>
    </div>
  );
}

export const AttackDiceDisplay = ({
  dice,
  isMyBoard,
  channel,
  withElementalTuning,
}: DiceDisplayProps) => {
  const currentPhase = useRecoilValue(currentPhaseState);
  const myCurrentActiveCharacter = useRecoilValue(currentActiveCharacterState);
  const currentEnergy = myCurrentActiveCharacter?.energy || 0;
  return (
    <div>
      <ul className="flex flex-row gap-1 flex-wrap justify-center">
        {Object.entries(dice)
          .toSorted()
          .map(([element, amount]) =>
            element !== "ENERGY" ? (
              <DiceOfElement
                element={element as DieElementName}
                amount={amount}
                isMyBoard={isMyBoard}
                dieSize={4}
                displayDiceSelection={false}
              />
            ) : (
              <RequiredEnergyDisplay
                energy={amount}
                energySize={4}
                currentEnergy={currentEnergy}
                showCurrentEnergy
              ></RequiredEnergyDisplay>
            )
          )}
      </ul>
      {withElementalTuning && isMyBoard && currentPhase === "ACTION_PHASE" && (
        <ElementalTuning channel={channel || null} />
      )}
    </div>
  );
};
