import {
  addOneCardFromDeckByName,
  createOmniDice,
  createRandomDice,
  drawCards,
} from "@/app/actions";
import { CardExtended } from "@/app/global";
import { executePhaseEffectsForBothPlayers, PhaseName } from "@/app/utils";
import {
  amIReadyForNextPhaseState,
  currentGameIDState,
  currentPhaseState,
  currentPlayerIDState,
  currentRoundState,
  isOpponentReadyForNextPhaseState,
  myInGameCardsState,
  myIDState,
  myDiceState,
  opponentDiceState,
  opponentInGameCardsState,
  amIPlayer1State,
  isMyTurnState,
  gameWinnerIDState,
  opponentIDState,
  nextRoundFirstPlayerIDState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { use, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

export default ({}) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const [isOpponentReadyForNextPhase, setIsOpponentReadyForNextPhase] =
    useRecoilState(isOpponentReadyForNextPhaseState);
  const [amIReadyForNextPhase, setAmIReadyForNextPhase] = useRecoilState(
    amIReadyForNextPhaseState
  );
  const [gameWinnerID, setGameWinnerID] = useRecoilState(gameWinnerIDState);
  const [currentPhase, setCurrentPhase] = useRecoilState(currentPhaseState);
  const [currentRound, setCurrentRound] = useRecoilState(currentRoundState);
  const [currentPlayerID, setCurrentPlayerID] =
    useRecoilState(currentPlayerIDState);
  const [nextRoundFirstPlayerID, setNextRoundFirstPlayerID] = useRecoilState(
    nextRoundFirstPlayerIDState
  );
  const [opponentCards, setOpponentCards] = useRecoilState(
    opponentInGameCardsState
  );
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);
  const [amIPlayer1, setamIPlayer1] = useRecoilState(amIPlayer1State);
  const isMyTurn = useRecoilValue(isMyTurnState);

  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game:" + gameID, {
      config: { presence: { key: myID } },
    });
    channel
      .on("presence", { event: "join" }, ({ key }) => {
        //TODO:
      })
      .on("broadcast", { event: "initialize_board" }, ({ payload }) => {
        setMyCards(payload.opponentCards);
        setOpponentCards(payload.myCards);
        setMyDice(payload.opponentDice);
        setOpponentDice(payload.myDice);
      })
      .on("broadcast", { event: "ready_for_next_phase" }, ({ payload }) => {
        setIsOpponentReadyForNextPhase(payload.isReadyForNextPhase);
      })
      .on("broadcast", { event: "updated_cards" }, ({ payload }) => {
        const { myUpdatedCards, opponentUpdatedCards } = payload;
        myUpdatedCards?.length && setOpponentCards(payload.myUpdatedCards);
        opponentUpdatedCards?.length &&
          setMyCards(payload.opponentUpdatedCards);
      })
      .on("broadcast", { event: "updated_dice" }, ({ payload }) => {
        const { myUpdatedDice, opponentUpdatedDice } = payload;
        myUpdatedDice && setOpponentDice(myUpdatedDice);
        opponentUpdatedDice && setMyDice(opponentUpdatedDice);
      })
      .on("broadcast", { event: "updated_cards_and_dice" }, ({ payload }) => {
        const { myCards, opponentCards, myDice, opponentDice } = payload;
        myCards && setOpponentCards(myCards);
        opponentCards && setMyCards(opponentCards);
        myDice && setOpponentDice(myDice);
        opponentDice && setMyDice(opponentDice);
      })
      .on("broadcast", { event: "switch_player" }, ({ payload }) => {
        const { playerID } = payload;
        playerID && setCurrentPlayerID(playerID);
      })
      .on("broadcast", { event: "game_over" }, ({ payload }) => {
        setGameWinnerID(payload.gameWinnerID);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            online_at: new Date().toISOString(),
            cards: myCards,
          });
          console.log("turn and phase", presenceTrackStatus);
        }
      });
    setChannel(channel);
    return () => {
      console.log("unsubscribing in turn and phase");
      setChannel(null);
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!channel || !currentPhase) return;
    let myUpdatedCards = myCards;
    let myUpdatedDice = myDice;
    let opponentUpdatedCards = opponentCards;
    let opponentUpdatedDice = opponentDice;
    switch (currentPhase) {
      case "PREPARATION_PHASE":
        break;
      case "ROLL_PHASE":
        setCurrentPlayerID(nextRoundFirstPlayerID);
        //TODO: revert to createRandomDice
        myUpdatedDice = createOmniDice(8);
        opponentUpdatedDice = createOmniDice(8);
        //TODO: reset dice
        break;
      case "ACTION_PHASE":
        break;
      case "END_PHASE":
        myUpdatedCards = drawCards(myUpdatedCards, 2);
        opponentUpdatedCards = drawCards(opponentUpdatedCards, 2);
    }
    //player 1 executes phase effects for both players and broadcasts the updated cards and dice
    if (
      !(
        amIPlayer1 &&
        myCards?.length &&
        myDice &&
        opponentCards?.length &&
        opponentDice
      )
    )
      return;
    //no phase effects activate in preparation phase
    if (currentPhase === "PREPARATION_PHASE") return;
    const areMyEffectsFirst = nextRoundFirstPlayerID === myID;
    const phaseEffectsExecuteArgs = areMyEffectsFirst
      ? {
          currentRound,
          myCards: myUpdatedCards,
          myDice: myUpdatedDice,
          opponentCards: opponentUpdatedCards,
          opponentDice: opponentUpdatedDice,
        }
      : {
          currentRound,
          myCards: opponentUpdatedCards,
          myDice: opponentUpdatedDice,
          opponentCards: myUpdatedCards,
          opponentDice: myUpdatedDice,
        };
    const {
      myUpdatedCards: myCardsAfterPhaseEffects,
      myUpdatedDice: myDiceAfterPhaseEffects,
      opponentUpdatedCards: opponentCardsAfterPhaseEffects,
      opponentUpdatedDice: opponentDiceAfterPhaseEffects,
      errorMessage,
    } = executePhaseEffectsForBothPlayers({
      phaseName: currentPhase,
      executeArgs: phaseEffectsExecuteArgs,
    });
    if (errorMessage) {
      console.error(errorMessage);
      return;
    }
    if (areMyEffectsFirst) {
      myUpdatedCards = myCardsAfterPhaseEffects;
      myUpdatedDice = myDiceAfterPhaseEffects;
      opponentUpdatedCards = opponentCardsAfterPhaseEffects;
      opponentUpdatedDice = opponentDiceAfterPhaseEffects;
    } else {
      myUpdatedCards = opponentCardsAfterPhaseEffects;
      myUpdatedDice = opponentDiceAfterPhaseEffects;
      opponentUpdatedCards = myCardsAfterPhaseEffects;
      opponentUpdatedDice = myDiceAfterPhaseEffects;
    }
    if (currentPhase === "END_PHASE") {
      //reset usages on all cards and effects
      const resetStatusesAndEffects = (cards: CardExtended[]) => {
        return cards.map((card) => ({
          ...card,
          usages_this_turn: 0,
          effects: card.effects.map((effect) => ({
            ...effect,
            usages_this_turn: 0,
          })),
          //reduce duration of all effects by 1
          statuses: card.statuses?.map((status) => ({
            ...status,
            duration:
              status.duration === undefined ? undefined : status.duration - 1,
          })),
          hasUsedFoodThisTurn: false,
        }));
      };
      myUpdatedCards = resetStatusesAndEffects(myUpdatedCards);
      opponentUpdatedCards = resetStatusesAndEffects(opponentUpdatedCards);
    }
    setTimeout(() => {
      channel
        .send({
          type: "broadcast",
          event: "updated_cards_and_dice",
          payload: {
            myCards: myUpdatedCards,
            myDice: myUpdatedDice,
            opponentCards: opponentUpdatedCards,
            opponentDice: opponentUpdatedDice,
          },
        })
        .then((res) => {
          console.log("sent updated cards", res);
        });
    }, 400);

    setMyCards(myUpdatedCards);
    setMyDice(myUpdatedDice);
    setOpponentCards(opponentUpdatedCards);
    setOpponentDice(opponentUpdatedDice);
  }, [channel, currentPhase]);

  //only happens once at the beginning of the game
  useEffect(() => {
    !currentPhase &&
      myCards &&
      opponentCards &&
      setCurrentPhase("PREPARATION_PHASE");
  }, [myCards, opponentCards, currentPhase]);

  useEffect(() => {
    if (!amIPlayer1 || !myCards?.length || !opponentCards?.length) return;
    const allCharactersHaveBeenDefeated = (cards: CardExtended[]) => {
      return (
        cards.filter(
          (card) => card.location === "CHARACTER" && card.health === 0
          //TODO: revert to 3
        ).length === 1
      );
    };
    const updateGameWinnerInDatabase = async (gameWinnerID: string) => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("game")
        .update({ winner_id: gameWinnerID })
        .eq("id", gameID)
        .single();
      if (error) console.error("error", error);
      console.log("updated game winner", data);
    };
    const updateAndBroadcastGameWinner = async (gameWinnerID: string) => {
      await updateGameWinnerInDatabase(gameWinnerID);
      setGameWinnerID(gameWinnerID);
      setTimeout(() => {
        channel?.send({
          type: "broadcast",
          event: "game_over",
          payload: { gameWinnerID },
        });
      }, 400);
    };
    let gameWinnerID;
    if (allCharactersHaveBeenDefeated(myCards)) {
      gameWinnerID = opponentID;
    } else if (allCharactersHaveBeenDefeated(opponentCards)) {
      gameWinnerID = myID;
    }
    if (gameWinnerID) {
      updateAndBroadcastGameWinner(gameWinnerID);
    }
  }, [myCards, opponentCards]);

  useEffect(() => {
    //TODO: redirect to home
    if (!gameWinnerID) return;
    if (gameWinnerID === myID) {
      alert("You won!");
    } else {
      alert("You lost");
    }
  }, [gameWinnerID]);

  useEffect(() => {
    if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
      if (currentPhase === "ACTION_PHASE") {
        console.log("currentPlayerID", currentPlayerID);
        //the player that ended the action phase (?) first is the first player of the next round
        //if both players are ready, it means the current turn player ended the round second and will go second next round
        setNextRoundFirstPlayerID(currentPlayerID === myID ? opponentID : myID);
        setCurrentRound((prev) => prev + 1);
      }
      setCurrentPhase((prev) => {
        if (!prev) return "PREPARATION_PHASE";
        if (prev === "END_PHASE") {
          return "ROLL_PHASE";
        }
        const phases: PhaseName[] = ["ROLL_PHASE", "ACTION_PHASE", "END_PHASE"];
        const currentIndex = phases.indexOf(prev);
        return phases[currentIndex + 1];
      });
      setAmIReadyForNextPhase(false);
      setIsOpponentReadyForNextPhase(false);
    }
  }, [amIReadyForNextPhase, isOpponentReadyForNextPhase]);

  return (
    <div className="text-slate-100 flex gap-4">
      <span>Round {currentRound}</span>
      <button
        onClick={async () => {
          await channel?.send({
            type: "broadcast",
            event: "ready_for_next_phase",
            payload: {
              isReadyForNextPhase: !amIReadyForNextPhase,
            },
          });
          setAmIReadyForNextPhase((prev) => !prev);
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
          const updatedCards = drawCards(myCards, 2);
          channel?.send({
            type: "broadcast",
            event: "updated_cards",
            payload: { myUpdatedCards: updatedCards },
          });
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
          channel?.send({
            type: "broadcast",
            event: "updated_cards",
            payload: { myUpdatedCards: newState },
          });
          setMyCards(newState);
        }}
      >
        add card
      </button>
      {/* <button
        className="bg-pink-500"
        onClick={() => setMyDice({ ANEMO: 4, CRYO: 4 })}
      >
        create dice
      </button> */}

      {/* ------------------- */}
      <span>
        {isMyTurn && "My turn"}
        {currentPhase} {amIPlayer1 ? "player1" : "player2"}
      </span>
    </div>
  );
};
