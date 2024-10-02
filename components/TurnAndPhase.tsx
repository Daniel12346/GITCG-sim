import {
  addOneCardFromDeckByName,
  createRandomDice,
  drawCards,
} from "@/app/actions";
import { CardExtended } from "@/app/global";
import {
  executeEffectsSequentially,
  executePhaseEffectsForBothPlayers,
  findEffectsThatTriggerOn,
} from "@/app/utils";
import {
  amIReadyForNextPhaseState,
  currentGameIDState,
  currentPhaseState,
  currentPlayerIDState,
  currentRoundState,
  isOpponentReadyForNextPhaseState,
  myInGameCardsState,
  myIDState,
  opponentIDState,
  opponentCardsState,
  myDiceState,
  opponentDiceState,
  opponentInGameCardsState,
  amIPlayer1State,
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
  const [currentRound, setCurrentRound] = useRecoilState(currentRoundState);
  const [turnPlayerID, setTurnPlayerID] = useRecoilState(currentPlayerIDState);
  const [opponentCards, setOpponentCards] = useRecoilState(
    opponentInGameCardsState
  );
  const opponentID = useRecoilValue(opponentIDState);
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);
  const [amIPlayer1, setamIPlayer1] = useRecoilState(amIPlayer1State);
  //TODO: move to recoil atom ?
  const [areDecksInitialized, setareDecksInitialized] = useState(false);

  useEffect(() => {
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
      .on("broadcast", { event: "updated_cards" }, ({ payload }) => {
        console.log(
          "updated_cards",
          payload.newCardsState.filter(
            (card: CardExt) => card.location === "HAND"
          )
        );

        //TODO: break into multiple events if possible
        if (payload.playerID !== myID) {
          setOpponentCards(payload.newCardsState);
        }
      })
      .on("broadcast", { event: "start_next_phase" }, ({ payload }) => {
        setAmIReadyForNextPhase((_) => false);
        setIsOpponentReadyForNextPhase((_) => false);
        let nextPhase: "PREPARATION" | "ROLL" | "ACTION" | "END";
        console.log("start_next_phase", payload.currentPhase);
        switch (payload.currentPhase) {
          //the preparation phase only happens once at the beginning of the game
          case "PREPARATION":
            nextPhase = "ROLL";
            break;
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
          setCurrentRound((prev) => prev + 1);
        }
        setCurrentPhase(nextPhase);
      })
      .on("broadcast", { event: "updated_dice" }, ({ payload }) => {
        if (payload.playerID !== myID) {
          setOpponentDice(payload.newDiceState);
        }
      })
      .on("broadcast", { event: "switch_player" }, ({ payload }) => {
        setTurnPlayerID(payload.playerID);
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
  }, []);
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
  }, [amIReadyForNextPhase, isOpponentReadyForNextPhase]);
  useEffect(() => {
    if (!channel) return;
    switch (currentPhase) {
      case "PREPARATION":
        const randomDice = createRandomDice(8);
        //TODO: display and reroll dice
        channel.send({
          type: "broadcast",
          event: "dice_change",
          payload: { dice: randomDice, playerID: myID },
        });
        setMyDice(randomDice);
        setMyCards((prev) => prev && drawCards(prev, 5));
        //TODO: switch cards
        break;
      case "ROLL":
        //TODO: reroll dice
        //TODO: are cards drawn in the first turn?
        setMyCards((prev) => prev && drawCards(prev, 2));
        break;
      case "ACTION":
        if (
          !amIPlayer1 ||
          !myCards?.length ||
          !myDice ||
          !opponentCards?.length ||
          !opponentDice
        )
          return;
        alert("action phase");
        const {
          myUpdatedCards: myCardsAfterPhaseEffects,
          myUpdatedDice: myDiceAfterPhaseEffects,
          opponentUpdatedCards: opponentCardsAfterPhaseEffects,
          opponentUpdatedDice: opponentDiceAfterPhaseEffects,
          errorMessage,
        } = executePhaseEffectsForBothPlayers({
          phaseName: "ACTION_PHASE",
          executeArgs: {
            currentRound,
            myCards,
            myDice,
            opponentCards,
            opponentDice,
          },
        });
        if (errorMessage) {
          console.error(errorMessage);
          break;
        }
        console.log(
          "myCardsAfterPhaseEffects",
          myCardsAfterPhaseEffects,
          "myDiceAfterPhaseEffects",
          myDiceAfterPhaseEffects
        );
        setMyCards(myCardsAfterPhaseEffects);
        setMyDice(myDiceAfterPhaseEffects);
        setOpponentCards(opponentCardsAfterPhaseEffects);
        setOpponentDice(opponentDiceAfterPhaseEffects);
    }
  }, [currentPhase]);

  useEffect(() => {
    if (!areDecksInitialized && myCards?.length && opponentCards?.length) {
      setareDecksInitialized(true);
    }
  }, [myCards, opponentCards]);

  //broadcast changes to cards
  useEffect(() => {
    setTimeout(() => {
      myCards &&
        myCards.length &&
        channel
          ?.send({
            type: "broadcast",
            event: "updated_cards",
            payload: { playerID: myID, newCardsState: myCards },
          })
          .then((res) => console.log("updated_cards !:", res));
    }, Math.random() * 1000);
  }, [channel, myCards]);

  useEffect(() => {
    setTimeout(() => {
      myDice &&
        channel
          ?.send({
            type: "broadcast",
            event: "updated_dice",
            payload: { playerID: myID, newDiceState: myDice },
          })
          .then((res) => console.log("updated_dice", res));
    }, 100 + Math.random() * 1000);
  }, [channel, myCards]);

  //only happens once at the beginning of the game
  useEffect(() => {
    areDecksInitialized && setCurrentPhase("PREPARATION");
  }, [areDecksInitialized]);

  return (
    <div className="text-slate-100 flex gap-4">
      <span>Turn {currentRound}</span>
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
        Move to next phase:
        <span className="underline">
          {amIReadyForNextPhase ? "ready" : "not ready"}
        </span>
      </button>
      <button
        className="bg-blue-500"
        onClick={() => {
          if (!myCards?.length) return;
          setMyCards((prev) => prev && drawCards(prev, 2));
        }}
      >
        draw
      </button>
      {/* TEST:------------------ */}
      <button
        className="bg-pink-500"
        onClick={() => {
          if (!myCards?.length) return;
          const card = prompt("card name");
          if (!card) return;
          const newState = addOneCardFromDeckByName(myCards, card);
          setMyCards(newState);
        }}
      >
        add card
      </button>
      <button
        className="bg-pink-500"
        onClick={() => setMyDice({ ANEMO: 4, CRYO: 4 })}
      >
        create dice
      </button>

      {/* ------------------- */}
      <span>{currentPhase} PHASE</span>
    </div>
  );
};
