import {
  addOneCardFromDeckByName,
  createRandomDice,
  drawCards,
} from "@/app/actions";
import { CardExtended } from "@/app/global";
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
  opponentCardsState,
  myDiceState,
  opponentDiceState,
  opponentInGameCardsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { use, useEffect, useState } from "react";
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
  const [opponentCards, setOpponentCards] = useRecoilState(
    opponentInGameCardsState
  );
  const opponentID = useRecoilValue(opponentIDState);
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const setMyDice = useSetRecoilState(myDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);
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
      .on("broadcast", { event: "dice_change" }, ({ payload }) => {
        console.log("dice_change", payload);
        if (payload.playerID !== myID) {
          setOpponentDice(payload.dice);
        }
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
        setMyDice(randomDice);
        //TODO: display and reroll dice
        channel.send({
          type: "broadcast",
          event: "dice_change",
          payload: { dice: randomDice, playerID: myID },
        });
        //throttled because messages from both players would be sent at the same time, exceeding the rate limit
        setTimeout(() => {
          setMyCards((prev) => prev && drawCards(prev, 5));
        }, Math.random() * 1000);

        //TODO: switch cards
        break;
      case "ROLL":
        //TODO: reroll dice
        //TODO: are cards drawn in the first turn?
        setTimeout(() => {
          setMyCards((prev) => prev && drawCards(prev, 2));
        }, Math.random() * 1000);
        break;
    }
  }, [currentPhase]);

  useEffect(() => {
    if (!areDecksInitialized && myCards?.length && opponentCards?.length) {
      setareDecksInitialized(true);
    }
  }, [myCards, opponentCards]);

  useEffect(() => {
    myCards &&
      myCards.length &&
      channel
        ?.send({
          type: "broadcast",
          event: "updated_cards",
          payload: { playerID: myID, newCardsState: myCards },
        })
        .then((res) => console.log("updated_cards", res));
  }, [channel, myCards]);

  //only happens once at the beginning of the game
  useEffect(() => {
    areDecksInitialized && setCurrentPhase("PREPARATION");
  }, [areDecksInitialized]);

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
      <button
        className="bg-pink-500"
        onClick={() => {
          console.log(
            "OPP",
            opponentCards,
            "hand",
            opponentCards.filter((card) => card.location === "HAND")
          );
        }}
      >
        log opp cards
      </button>

      {/* ------------------- */}
      <span>{currentPhase} PHASE</span>
    </div>
  );
};
