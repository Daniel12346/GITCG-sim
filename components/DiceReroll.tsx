import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import DiceDisplay from "./DiceDisplay";
import {
  amIRerollingState,
  currentPhaseState,
  myDiceState,
  mySelectedDiceState,
} from "@/recoil/atoms";
import { addDice, createRandomDice, subtractCost } from "@/app/actions";
import { broadcastUpdatedCardsAndDice, calculateTotalDice } from "@/app/utils";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from "react";

export default function DiceReroll({
  channel,
}: {
  channel: RealtimeChannel | null;
}) {
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const selectedDice = useRecoilValue(mySelectedDiceState);
  const [amIRerolling, setAmIRerolling] = useRecoilState(amIRerollingState);
  const setSelectedDice = useSetRecoilState(mySelectedDiceState);
  const currentPhase = useRecoilValue(currentPhaseState);
  const rerollDice = () => {
    try {
      const amountSelected = calculateTotalDice(selectedDice);
      if (amountSelected === 0) return;
      const leftoverDice = subtractCost(myDice, selectedDice);
      const newDice = createRandomDice(amountSelected);
      const updatedDice = addDice(leftoverDice, newDice);
      console.log(
        "rerolling dice",
        leftoverDice,
        newDice,
        updatedDice,
        "selected",
        selectedDice,
        calculateTotalDice(selectedDice)
      );
      channel && broadcastUpdatedCardsAndDice({ channel, myDice: updatedDice });
      setMyDice(updatedDice);
      setSelectedDice({});
      setAmIRerolling(false);
    } catch (e) {
      console.log("Error rerolling dice", e);
    }
  };
  useEffect(() => {
    if (currentPhase === "ROLL_PHASE") {
      setAmIRerolling(true);
    } else {
      setAmIRerolling(false);
    }
  }, [currentPhase]);
  return (
    <div
      //TODO: center properly
      className="absolute top-[50%]
    left-[50%] -translate-x-1/2 -translate-y-1/2
      flex items-center justify-center z-[100] overflow-hidden pointer-events-none"
    >
      {currentPhase === "ROLL_PHASE" && amIRerolling && (
        <div className="bg-blue-600 p-4 border-yellow-300 border-solid border-4 overflow-hidden pointer-events-auto">
          {/* should not be displayed at all for the other player's board */}

          <DiceDisplay dice={myDice} isMyBoard={true}></DiceDisplay>
          <span className="flex justify-between w-full">
            <button onClick={rerollDice}>reroll</button>
            <button
              onClick={() => {
                setAmIRerolling(false);
              }}
            >
              confirm
            </button>
          </span>
        </div>
      )}
    </div>
  );
}