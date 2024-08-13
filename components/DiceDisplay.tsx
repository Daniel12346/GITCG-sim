import { mySelectedDiceState } from "@/recoil/atoms";
import { useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

type DiceDisplayProps = {
  dice: Dice;
  isMyBoard: boolean;
};

const Die = ({
  element,
  isMyBoard,
  isSelected,
}: {
  element: DieElementName;
  isMyBoard: boolean;
  isSelected: boolean;
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
    //the dice itself
    <div
      key={element + isMyBoard}
      onClick={handleSelectDie}
      className={`text-sm w-4 h-4 ${bgColors[element]} ${
        isMyBoard && isSelected && "ring-2 ring-gray-700"
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
  const selectedDice = useRecoilValue(mySelectedDiceState);
  const amountSelected = selectedDice[element] || 0;
  return Array.from({ length: amount }).map((_, i) => {
    const isSelected = i < amountSelected;
    return (
      <Die element={element} isMyBoard={isMyBoard} isSelected={isSelected} />
    );
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
