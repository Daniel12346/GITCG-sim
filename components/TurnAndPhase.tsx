import {
  addOneCardFromDeckByName,
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
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);
  const [amIPlayer1, setamIPlayer1] = useRecoilState(amIPlayer1State);
  //TODO: move to recoil atom ?

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
        console.log(
          "received_cards",
          payload,
          myUpdatedCards?.filter((card: CardExt) => card.location === "HAND"),
          opponentUpdatedCards?.filter(
            (card: CardExt) => card.location === "HAND"
          )
        );
        myUpdatedCards?.length && setOpponentCards(payload.myUpdatedCards);
        opponentUpdatedCards?.length &&
          setMyCards(payload.opponentUpdatedCards);
      })
      .on("broadcast", { event: "updated_dice" }, ({ payload }) => {
        console.log("updated_dice", payload, myID);
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
        setTurnPlayerID(payload.playerID);
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
  //making a separate effect to broadcast "start_next_phase" because the channel does not receive update recoil state
  // useEffect(() => {
  //   if (!channel) return;
  //   if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
  //     channel.send({
  //       type: "broadcast",
  //       event: "start_next_phase",
  //       payload: { currentPhase, turnPlayerID },
  //     });
  //   }
  // }, [amIReadyForNextPhase, isOpponentReadyForNextPhase]);
  useEffect(() => {
    console.log("currentPhase", currentPhase);

    if (!channel || !currentPhase) return;
    let myUpdatedCards = myCards;
    let myUpdatedDice = myDice;
    let opponentUpdatedCards = opponentCards;
    let opponentUpdatedDice = opponentDice;
    switch (currentPhase) {
      case "PREPARATION_PHASE":
        break;
      case "ROLL_PHASE":
        //TODO: reroll dice
        myUpdatedCards = drawCards(myUpdatedCards, 2);
        opponentUpdatedCards = drawCards(opponentUpdatedCards, 2);
        break;
      case "ACTION_PHASE":
        break;
    }
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
    const {
      myUpdatedCards: myCardsAfterPhaseEffects,
      myUpdatedDice: myDiceAfterPhaseEffects,
      opponentUpdatedCards: opponentCardsAfterPhaseEffects,
      opponentUpdatedDice: opponentDiceAfterPhaseEffects,
      errorMessage,
    } = executePhaseEffectsForBothPlayers({
      phaseName: currentPhase,
      executeArgs: {
        currentRound,
        myCards: myUpdatedCards,
        myDice: myUpdatedDice,
        opponentCards: opponentUpdatedCards,
        opponentDice: opponentUpdatedDice,
      },
    });
    if (errorMessage) {
      console.error(errorMessage);
      return;
    }
    myUpdatedCards = myCardsAfterPhaseEffects;
    myUpdatedDice = myDiceAfterPhaseEffects;
    opponentUpdatedCards = opponentCardsAfterPhaseEffects;
    opponentUpdatedDice = opponentDiceAfterPhaseEffects;
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
            duration: status.duration - 1,
          })),
          hasUsedFoodThisTurn: false,
        }));
      };
      myUpdatedCards = resetStatusesAndEffects(myUpdatedCards);
      opponentUpdatedCards = resetStatusesAndEffects(opponentUpdatedCards);
    }
    console.log(
      "cards in hand",
      myUpdatedCards.filter((card) => card.location === "HAND"),
      opponentUpdatedCards.filter((card) => card.location === "HAND")
    );
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
    }, 300);

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
    if (amIReadyForNextPhase && isOpponentReadyForNextPhase) {
      if (currentPhase === "END_PHASE") {
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
          //TODO: fix
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
        {currentPhase} {amIPlayer1 ? "player1" : "player2"}
      </span>
    </div>
  );
};
