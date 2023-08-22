import {
  amIReadyForNextPhaseState,
  currentGameIDState,
  currentPhaseState,
  currentPlayerIDState,
  currentTurnState,
  isOpponentReadyForNextPhaseState,
  myInGameCardsState,
  myIDState,
  opponentIDState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

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
  const [turnPlayerID, setTurnPlayerID] = useRecoilState(currentPlayerIDState);
  const [opponentInGameCards, setOpponentInGameCards] = useRecoilState(
    opponentInGameCardsState
  );
  const opponentID = useRecoilValue(opponentIDState);
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);

  function drawCards(currentCards: CardExt[], amount: number) {
    const newCardsState = currentCards.map((card) => {
      let location = card.location;
      if (card.location === "DECK" && amount > 0) {
        location = "HAND";
        amount--;
      }
      return { ...card, location };
    });
    console.log("newCardsState", newCardsState, channel);
    channel?.send({
      type: "broadcast",
      event: "draw_cards",
      payload: { playerID: myID, newCardsState },
    });
  }

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
      .on(
        //TODO: handle better if possible (no need to change the state of every card?)
        "broadcast",
        { event: "draw_cards" },
        ({ payload }) => {
          console.log("draw_cards", payload);
          const { playerID, newCardsState } = payload;
          console.log("draw_cards", playerID, newCardsState);
          if (playerID === myID) {
            setMyCards(newCardsState);
          } else {
            setOpponentInGameCards(newCardsState);
          }
        }
      )
      .on("broadcast", { event: "start_next_phase" }, ({ payload }) => {
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
      setChannel(null);
      supabase.removeChannel(channel);
    };
  }, [opponentInGameCards]);
  //making a separate effect to broadcast "start_next_phase" because the channel does not receive update recoil state
  useEffect(() => {
    if (!channel) return;
    if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
      channel.send({
        type: "broadcast",
        event: "start_next_phase",
        payload: { currentPhase, turnPlayerID },
      });
    }
  }, [channel, amIReadyForNextPhase, isOpponentReadyForNextPhase]);
  return (
    <div>
      <span>Turn {currentTurn}</span>
      <button
        onClick={() => {
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
      <button
        className="bg-blue-500"
        onClick={() => {
          console.log("drawing cards", myCards);
          myCards && drawCards(myCards, 2);
        }}
      >
        draw
      </button>
      <span>{currentPhase} PHASE</span>
    </div>
  );
};
