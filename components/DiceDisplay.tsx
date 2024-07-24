import { selectedDiceState } from "@/recoil/atoms";
import { useState } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";

type DiceDisplayProps = {
  dice: Dice;
  isMyBoard: boolean;
};

const Die = ({
  element,
  isMyBoard,
}: {
  element: DieElementName;
  isMyBoard: boolean;
}) => {
  let bgColors = {
    ANEMO: "bg-cyan-300",
    DENDRO: "bg-green-300",
    PYRO: "bg-red-300",
    HYDRO: "bg-blue-300",
    ELECTRO: "bg-yellow-300",
    CRYO: "bg-blue-300",
    GEO: "bg-yellow-300",
    OMNI: "bg-gray-300",
  };
  const [isSelected, setIsSelected] = useState(false);
  const [selectedDice, setSelectedDice] = useRecoilState(selectedDiceState);
  const handleSelectDie = () => {
    if (!isMyBoard) return;
    if (isSelected) {
      if (!selectedDice[element]) return;
      setIsSelected(false);
      setSelectedDice((prev) => {
        let newDice = { ...prev };
        newDice[element] = newDice[element]! - 1;
        return newDice;
      });
    } else {
      // if (!selectedDice[element]) return;
      setIsSelected(true);
      setSelectedDice((prev) => {
        let newDice = { ...prev };
        newDice[element] = newDice[element] ? newDice[element] + 1 : 1;
        return newDice;
      });
    }
  };

  return (
    //the dice itself
    <div
      key={element}
      onClick={handleSelectDie}
      className={`text-sm w-4 h-4 ${bgColors[element]} ${
        isSelected && "ring-2 ring-gray-700"
      }`}
    ></div>
  );
};

const DiceOfElement = ({
  element,
  amount,
  isMyBoard,
}: {
  element: DieElementName;
  amount: number;
  isMyBoard: boolean;
}) => {
  return Array.from({ length: amount }).map((_) => {
    return <Die element={element} isMyBoard={isMyBoard} />;
  });
};

export default function DiceDisplay({ dice, isMyBoard }: DiceDisplayProps) {
  return (
    <ul className="bg-yellow-50 flex gap-1 flex-wrap">
      {Object.entries(dice)
        .sort()
        .map(([element, amount]) => (
          <DiceOfElement
            element={element as DieElementName}
            amount={amount}
            isMyBoard={isMyBoard}
          />
        ))}
    </ul>
  );
}
