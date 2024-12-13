import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import DiceDisplay from "./DiceDisplay";
import {
  amIPlayer1State,
  amIRerollingState,
  currentPhaseState,
  myDiceState,
  mySelectedDiceState,
  opponentDiceState,
} from "@/recoil/atoms";
import { addDice, createRandomDice, subtractCost } from "@/app/actions";
import { broadcastUpdatedCardsAndDice, calculateTotalDice } from "@/app/utils";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from "react";
import { Check, RefreshCcw, RefreshCw } from "lucide-react";

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
  const handleReroll = () => {
    try {
      const amountSelected = calculateTotalDice(selectedDice);
      if (amountSelected === 0) return;
      const leftoverDice = subtractCost(myDice, selectedDice);
      const newDice = createRandomDice(amountSelected);
      const updatedDice = addDice(leftoverDice, newDice);
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
      className="absolute top-[50%]
    left-[50%] -translate-x-1/2 -translate-y-1/2
      flex items-center justify-center z-[100] overflow-hidden pointer-events-none"
    >
      {currentPhase === "ROLL_PHASE" && amIRerolling && (
        <div className="animate-in bg-overlay p-4 border-yellow-300 border-solid border-4 overflow-hidden pointer-events-auto">
          <DiceDisplay
            dice={myDice}
            isMyBoard={true}
            displayDiceSelection
          ></DiceDisplay>
          <div className="flex justify-between w-full ">
            <div className="flex items-center gap-1">
              <button onClick={handleReroll}>reroll</button>
              <RefreshCw size={16} className="mt-0.5" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setAmIRerolling(false);
                }}
              >
                confirm
              </button>
              <Check size={16} className="mt-0.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
