import {
  currentGameIDState,
  currentPlayerIDState,
  myIDState,
  opponentIDState,
  opponentInGameCardsState,
  myDiceState,
  opponentDiceState,
  amSelectingTargetsState,
  mySelectedTargetCardsState,
  requiredTargetsState,
  currentEffectState,
  myInGameCardsState,
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
  playerID?: string;
}
const PlayerBoard = ({ playerID }: PlayerBoardProps) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);

  const [opponentInGameCards, setOpponentInGameCards] = useRecoilState(
    opponentInGameCardsState
  );
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMyBoard = playerID === myID;
  const playerCards = isMyBoard ? myCards : opponentInGameCards;
  const playerDice = isMyBoard ? myDice : opponentDice;

  useEffect(() => {
    if (!gameID || !myID) return;
    const supabase = createClientComponentClient<Database>();
    const ch = supabase
      .channel("game-cards:" + gameID)
      // .on(
      //   "broadcast",
      //   { event: "activate_card" },
      //   ({ payload: { card_id } }) => {
      //     setOpponentInGameCards((prev) => {
      //       return prev.map((card) => {
      //         if (card.id === card_id) {
      //           return { ...card, location: "ACTION" };
      //         }
      //         return card;
      //       });
      //     });
      //   }
      // )
      .on("broadcast", { event: "effect_executed" }, ({ payload }) => {
        console.log("effect_executed", payload);
        const { effect, myCards, myDice, opponentCards, opponentDice } =
          payload;
        //TODO: name this in a less confusing way
        effect && console.log("effect", effect);
        myCards && setOpponentInGameCards(myCards);
        myDice && setOpponentDice(myDice);
        opponentCards && setMyCards(opponentCards);
        opponentDice && setMyDice(opponentDice);
      })
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

  const handleActivateEffect = (effect: Effect) => {
    if (!myCards) return;

    //TODO: select effect
    console.log(effect);

    console.log(
      amSelectingTargets,
      effect.requiredTargets,
      selectedTargetCards
    );
    if (effect.requiredTargets && !amSelectingTargets) {
      setRequiredTargets(effect.requiredTargets);
      setCurrentEffect(effect);
      setAmSelectingTargets(true);
      return;
    }

    // const effectCard = activateCard(card);
    const {
      myUpdatedCards,
      myUpdatedDice,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
    } = activateEffect({
      playerID: myID,
      effect,
      myCards: myCards,
      myDice,
      opponentCards: opponentInGameCards,
      opponentDice: {},
      targetCards: selectedTargetCards,
    });
    if (errorMessage) {
      setErrorMessage(errorMessage);
      return;
    }
    const effectCard = myCards.find((c) => c.id === effect.card_id);
    if (!effectCard) {
      console.log("no effect card");
      return;
    }
    //updating the the effect whose effect was activated
    const updateEffectCard = (effectCard: CardExtended) => {
      return {
        ...effectCard,
        location: "ACTION",
        effects: effectCard.effects.map((eff) => {
          return {
            ...eff,
            total_usages: eff.total_usages ? eff.total_usages + 1 : 0,
            usages_this_turn: eff.usages_this_turn
              ? eff.usages_this_turn + 1
              : 0,
          };
        }),
      };
    };
    //the most recent card state
    const myCurrentCards = myUpdatedCards || myCards;
    const myCurrentCardsWithUpdatedEffectCard = myCurrentCards.map((card) => {
      if (card.id === effectCard.id) {
        return updateEffectCard(card);
      }
      return card;
    });
    setMyCards(myCurrentCardsWithUpdatedEffectCard);

    opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
    myUpdatedDice && setMyDice(myUpdatedDice);
    opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);
    setAmSelectingTargets(false);
    setSelectedTargets([]);
    channel?.send({
      type: "broadcast",
      event: "effect_executed",
      payload: {
        effect,
        playerID: myID,
        myCards: myCurrentCardsWithUpdatedEffectCard,
        myDice: myUpdatedDice,
        opponentCards: opponentUpdatedCards,
        opponentDice: opponentUpdatedDice,
      },
    });
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
        } bg-blue-100 col-span-full h-32 p-2 flex flex-row gap-2 justify-center items-center`}
      >
        hand
        {playerCards
          ?.filter((card) => card.location === "HAND")
          .map((card) => (
            <Card
              key={card.id}
              card={card}
              isFaceDown={!isMyBoard}
              handleClick={() => {
                handleActivateEffect(card.effects[0]);
              }}
            />
          ))}
        {amSelectingTargets && (
          <div>
            <button
              onClick={() => {
                setAmSelectingTargets(false);
                setCurrentEffect(null);
                setSelectedTargets([]);
              }}
              className="bg-orange-300"
            >
              Cancel Selection
            </button>
            <div className="bg-fuchsia-600">
              <button
                className="bg-yellow-200"
                onClick={() => {
                  console.log("current effect", currentEffect);
                  if (!currentEffect) return;
                  handleActivateEffect(currentEffect);
                }}
              >
                confirm
              </button>
              {amSelectingTargets && errorMessage && (
                <span>{errorMessage}</span>
              )}
            </div>
            {amSelectingTargets && requiredTargets && (
              <span>{requiredTargets} targets needed</span>
            )}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 h-full p-1">
        deck zone{" "}
        {playerCards?.filter((card) => card.location === "DECK").length}
      </div>
      <div className="bg-yellow-50">
        action zone
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter(
              (card) =>
                card.location === "ACTION" &&
                card.subtype &&
                !["EQUIPMENT_ARTIFACT", "EQUIPMENT_WEAPON"].includes(
                  card.subtype
                )
            )
            .map((card) => (
              <Card
                isFaceDown={false}
                key={card.id}
                card={card}
                handleClick={() => amSelectingTargets && handleSelectCard(card)}
              />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-40">
        character zone
        <div className="flex flex-row justify-evenly gap-2 px-2">
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
      {/* //TODO: display dice */}
      <div className="bg-yellow-50 h-full overflow-hidden">
        {Object.entries(playerDice)
          .sort()
          .map(([element, amount]) => (
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

  return (
    <div>
      <PlayerBoard playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerID={myID} />
    </div>
  );
}
