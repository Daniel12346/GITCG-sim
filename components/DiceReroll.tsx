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
  const amIPlayer1 = useRecoilValue(amIPlayer1State);
  const setOpponentDice = useSetRecoilState(opponentDiceState);
  const rerollDice = () => {
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
      // if (amIPlayer1) {
      //   //resettting dice for both players
      //   const myDice = createRandomDice(8);
      //   const opponentDice = createRandomDice(8);
      //   setMyDice(myDice);
      //   setOpponentDice(opponentDice);
      //   channel &&
      //     broadcastUpdatedCardsAndDice({
      //       channel,
      //       myDice,
      //       opponentDice,
      //     });
      // }
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
