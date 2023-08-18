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
        //TODO: clean this up
        if (payload.playerID !== myID) {
          console.log("opp");
          setIsOpponentReadyForNextPhase(payload.isReadyForNextPhase);
        } else {
          console.log("me");
          console.log(payload.isReadyForNextPhase);
          setAmIReadyForNextPhase(payload.isReadyForNextPhase);
        }
        if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
          channel.send({
            type: "broadcast",
            event: "start_next_phase",
            payload: {},
          });
        }
        console.log(
          "ready_for_next_phase",
          payload,
          "me",
          amIReadyForNextPhase,
          "opp",
          isOpponentReadyForNextPhase
        );
      })
      .on("broadcast", { event: "start_next_phase" }, ({ payload }) => {
        //TODO:
        console.log("start_next_phase", payload);
        setAmIReadyForNextPhase(false);
        setIsOpponentReadyForNextPhase(false);
        let nextPhase: "PREPARATION" | "ROLL" | "ACTION" | "END";
        switch (currentPhase) {
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
        setCurrentPhase(nextPhase);
        setCurrentTurn(currentTurn + 1);
      })
      .subscribe(async (status) => {
        console.log("status", status);
      });
    setChannel(channel);
    return () => {
      // setGameChannel(null);
      console.log("unsubscribing in turn and phase");
      // channel.unsubscribe();
    };
  }, [opponentInGameCards]);
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
