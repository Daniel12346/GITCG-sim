import {
  currentGameIDState,
  currentPlayerIDState,
  myIDState,
  myInGameCardsState,
  opponentIDState,
  opponentInGameCardsState,
  myDiceState,
  opponentDiceState,
  amSelectingTargetsState,
  mySelectedTargetCardsState,
  requiredTargetsState,
  currentEffectState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import TurnAndPhase from "./TurnAndPhase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { use, useEffect, useState } from "react";
import Card from "./Card";
import { RealtimeChannel } from "@supabase/supabase-js";
import { activateCard, activateEffect, subtractCost } from "@/app/actions";
import { CardExtended } from "@/app/global";

//TODO: move to another file
interface PlayerBoardProps {
  playerCards: CardExt[];
  playerID?: string;
}
const PlayerBoard = ({ playerCards, playerID }: PlayerBoardProps) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const isMyBoard = playerID === myID;
  const [opponentInGameCards, setOpponentInGameCards] = useRecoilState(
    opponentInGameCardsState
  );
  const [myInGameCards, setMyInGameCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargetCards, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  const [requiredTargets, setRequiredTargets] =
    useRecoilState(requiredTargetsState);
  const [currentEffect, setCurrentEffect] = useRecoilState(currentEffectState);

  useEffect(() => {
    if (!gameID || !myID) return;
    const supabase = createClientComponentClient<Database>();
    const ch = supabase
      //TODO: do I need to make a separate channel for this?
      .channel("game-cards:" + gameID)
      .on(
        "broadcast",
        { event: "activate_card" },
        ({ payload: { card_id } }) => {
          setOpponentInGameCards((prev) => {
            return prev.map((card) => {
              if (card.id === card_id) {
                return { ...card, location: "ACTION" };
              }
              return card;
            });
          });
        }
      )
      .subscribe(async (status) => {
        console.log("subscribed to activate_card", status);
      });
    setChannel(ch);
    return () => {
      console.log("unsubscribing in activate_card ");
      channel && supabase.removeChannel(channel);
      setChannel(null);
    };
  }, [gameID, myID]);

  useEffect(() => {
    //TODO: ???????
    if (!myInGameCards) return;

    if (
      selectedTargetCards.length === requiredTargets &&
      amSelectingTargets &&
      currentEffect
    ) {
      const {
        myUpdatedCards,
        myUpdatedDice,
        opponentUpdatedCards,
        opponentUpdatedDice,
      } = activateEffect({
        playerID: myID,
        effect: currentEffect,
        myCards: myInGameCards,
        myDice,
        opponentCards: opponentInGameCards,
        opponentDice: {},
        targetCards: selectedTargetCards,
      });
      myUpdatedCards && setMyInGameCards(myUpdatedCards);
      myUpdatedDice && setMyDice(myUpdatedDice);
      opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
      opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);

      // setAmSelectingTargets(false);
      // setSelectedTargets([]);
      // setRequiredTargets(null);
    }
  }, [requiredTargets, selectedTargetCards, amSelectingTargets]);
  const handleSelectCard = (card: CardExt) => {
    //don't select the same card twice
    if (
      selectedTargetCards.find(
        (selected: CardExtended) => selected.id === card.id
      )
    ) {
      return;
    }
    setSelectedTargets((prev) => [...prev, card]);
  };

  return (
    <div
      className={`${
        isMyBoard ? "bg-green-400" : "bg-red-400"
      } grid grid-cols-[5%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_5%] 
    gap-2 w-screen p-2`}
      //TODO: default height
    >
      <div
        className={`${
          isMyBoard && "order-2"
        } bg-blue-100 col-span-full flex flex-row gap-2 justify-center`}
      >
        hand
        {playerCards
          ?.filter((card) => card.location === "HAND")
          .map((card) => (
            <Card
              key={card.id}
              card={card}
              handleClick={() => {
                if (!myInGameCards) return;

                //TODO: select effect
                const effect = card.effects[0];

                if (effect.requiredTargets && effect.requiredTargets > 0) {
                  setRequiredTargets(effect.requiredTargets);
                  setCurrentEffect(effect);
                  setAmSelectingTargets(true);
                  return;
                }

                const thisCard = activateCard(card);
                const {
                  myUpdatedCards,
                  myUpdatedDice,
                  opponentUpdatedCards,
                  opponentUpdatedDice,
                } = activateEffect({
                  thisCard,
                  playerID: myID,
                  effect,
                  myCards: myInGameCards,
                  myDice,
                  opponentCards: opponentInGameCards,
                  opponentDice: {},
                  targetCards: selectedTargetCards,
                });
                myUpdatedCards
                  ? setMyInGameCards(
                      myUpdatedCards.map((card) => {
                        if (card.id === thisCard.id) {
                          return thisCard;
                        }
                        return card;
                      })
                    )
                  : setMyInGameCards(
                      myInGameCards.map((card) => {
                        if (card.id === thisCard.id) {
                          return thisCard;
                        }
                        return card;
                      })
                    );
                opponentUpdatedCards &&
                  setOpponentInGameCards(opponentUpdatedCards);
                myUpdatedDice && setMyDice(myUpdatedDice);
                opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);
              }}
            />
          ))}
        <div>
          <button
            onClick={() => setAmSelectingTargets((prev) => !prev)}
            className="bg-orange-300"
          >
            Toggle Selection
          </button>
          {amSelectingTargets && requiredTargets && (
            <span>{requiredTargets} more targets needed</span>
          )}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        deck zone{" "}
        {playerCards.filter((card) => card.location === "DECK").length}
      </div>
      <div className="bg-yellow-50 h-full">
        action zone
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter((card) => card.location === "ACTION")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                handleClick={() => amSelectingTargets && handleSelectCard(card)}
              />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        character zone
        <div className="flex flex-row justify-evenly">
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                handleClick={() => amSelectingTargets && handleSelectCard(card)}
              />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
      {/* //TODO: move to another component and add opponent's dice */}
      <div className="bg-yellow-50 h-full">
        {Object.entries(myDice).map(([element, amount]) => (
          <span key={element + playerID}>
            {element}:{amount}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function GameBoard() {
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const gameID = useRecoilValue(currentGameIDState);
  const setOpponentInGameCards = useSetRecoilState(opponentInGameCardsState);
  const [currentPlayer, setcurrentPlayer] =
    useRecoilState(currentPlayerIDState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  return (
    <div>
      <PlayerBoard playerCards={opponentCards || []} playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerCards={myCards || []} playerID={myID} />
    </div>
  );
}
