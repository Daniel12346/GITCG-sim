import {
  amIReadyForNextPhaseState,
  currentGameIDState,
  currentPhaseState,
  currentTurnState,
  isOpponentReadyForNextPhaseState,
  myIDState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

export default ({}) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const [isOpponentReadyForNextPhase, setIsOpponentReadyForNextPhase] =
    useRecoilState(isOpponentReadyForNextPhaseState);
  const [amIReadyForNextPhase, setAmIReadyForNextPhase] = useRecoilState(
    amIReadyForNextPhaseState
  );
  const [currentPhase, setCurrentPhase] = useRecoilState(currentPhaseState);
  const [currentTurn, setCurrentTurn] = useRecoilState(currentTurnState);
  const opponentInGameCards = useRecoilValue(opponentInGameCardsState);

  useEffect(() => {
    if (!opponentInGameCards || !opponentInGameCards.length) return;
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID }, broadcast: { self: true } },
    });
    channel
      .on("broadcast", { event: "ready_for_next_phase" }, ({ payload }) => {
        if (payload.playerID !== myID) {
          setIsOpponentReadyForNextPhase(payload.isReadyForNextPhase);
        } else {
          setAmIReadyForNextPhase(payload.isReadyForNextPhase);
        }
      })
      .on("broadcast", { event: "start_next_phase" }, ({ payload }) => {
        //TODO:
        console.log("start_next_phase", payload);
        setAmIReadyForNextPhase((_) => false);
        setIsOpponentReadyForNextPhase((_) => false);
        let nextPhase: "PREPARATION" | "ROLL" | "ACTION" | "END";
        switch (payload.currentPhase) {
          //the preparation phase only happens once at the beginning of the game
          case "PREPARATION":
            nextPhase = "ROLL";
          case "ROLL":
            nextPhase = "ACTION";
            break;
          case "ACTION":
            nextPhase = "END";
            break;
          case "END":
            nextPhase = "ROLL";
            break;
          default:
            nextPhase = "ROLL";
            break;
        }
        if (payload.currentPhase == "END") {
          setCurrentTurn((prev) => prev + 1);
        }
        setCurrentPhase(nextPhase);
      })
      .subscribe(async (status) => {
        console.log("status", status);
      });
    setChannel(channel);
    return () => {
      console.log("unsubscribing in turn and phase");
      supabase.removeChannel(channel);
    };
  }, [opponentInGameCards]);
  //making a separate effect to broadcast "start_next_phase" because the channel does not receive updated amIReadyForNextPhase and isOpponentReadyForNextPhase
  useEffect(() => {
    if (!channel) return;
    if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
      channel.send({
        type: "broadcast",
        event: "start_next_phase",
        //passing the current phase in the payload because the channel does not recieve updated currentPhase
        payload: { currentPhase },
      });
    }
  }, [channel, amIReadyForNextPhase, isOpponentReadyForNextPhase]);
  return (
    <div>
      <span>Turn {currentTurn}</span>
      <button
        onClick={() => {
          console.log("click", amIReadyForNextPhase);
          channel?.send({
            type: "broadcast",
            event: "ready_for_next_phase",
            payload: {
              playerID: myID,
              isReadyForNextPhase: !amIReadyForNextPhase,
            },
          });
        }}
      >
        Move to next phase
        <span>{amIReadyForNextPhase ? "ready" : "not ready"}</span>
      </button>
      <span>{currentPhase} PHASE</span>
    </div>
  );
};
