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
  currentActiveCharacterAttacksState,
  currentlyBeingEquippedState,
  targetingPurposeState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import Card from "./Card";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  activateCard,
  activateEffect,
  subtractCost,
  switchActiveCharacterCard,
} from "@/app/actions";
import { CardExtended } from "@/app/global";
import { findCostModifyingEffects, findEquippedCards } from "@/app/utils";
import TargetSelectionOptions from "./TargetSelectionOptions";
import CardAttackInfo from "./CardAttackInfo";

//TODO: move to another file
interface PlayerBoardProps {
  playerID?: string;
}
export default function PlayerBoard({ playerID }: PlayerBoardProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);

  const [currentPlayerID, setCurrentPlayerID] =
    useRecoilState(currentPlayerIDState);
  const opponentID = useRecoilValue(opponentIDState);
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
  const [targetingPurpose, setTargetingPurpose] = useRecoilState(
    targetingPurposeState
  );
  const [currentEffect, setCurrentEffect] = useRecoilState(currentEffectState);
  const [currentlyBeingEquipped, setCurrentlyBeingEquipped] = useRecoilState(
    currentlyBeingEquippedState
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMyBoard = playerID === myID;
  const playerCards = isMyBoard ? myCards : opponentInGameCards;
  const playerDice = isMyBoard ? myDice : opponentDice;
  const attacks = useRecoilValue(currentActiveCharacterAttacksState);

  useEffect(() => {
    if (!gameID || !myID) return;
    const supabase = createClientComponentClient<Database>();
    const ch = supabase
      .channel("game-cards:" + gameID)
      .on("broadcast", { event: "effect_executed" }, ({ payload }) => {
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
    console.log("SELECTED", selectedTargetCards);
  };

  const handleSwitchCharacter = (card: CardExt) => {
    if (!myCards) return;
    const { errorMessage, myUpdatedCards } = switchActiveCharacterCard(
      myCards,
      card
    );
    console.log("switch", myUpdatedCards);

    if (errorMessage) {
      setErrorMessage(errorMessage);
      return;
    }
    myUpdatedCards && setMyCards(myUpdatedCards);
  };
  const switchCurrentPlayer = () => {
    const nextPlayerID = currentPlayerID === myID ? opponentID : myID;
    setCurrentPlayerID(nextPlayerID);
    channel?.send({
      type: "broadcast",
      event: "switch_player",
      payload: {
        playerID: nextPlayerID,
      },
    });
  };

  const handleEquipCard = (cardToEquip: CardExt, targetCard: CardExt) => {
    if (!myCards) return;
    if (cardToEquip.cost) {
      let updatedDice = null;
      try {
        console.log("subtr1", myDice, cardToEquip.cost);
        console.log("subtr2", subtractCost(myDice, cardToEquip.cost));

        updatedDice = subtractCost(myDice, cardToEquip.cost);
      } catch (e) {
        console.log(e);
        setErrorMessage("Not enough dice");
        return;
      }
      setMyDice(updatedDice);
    }
    const updatedCards = myCards.map((card) => {
      if (card.id === cardToEquip.id) {
        return {
          ...card,
          location: "EQUIPPED",
          equippedTo: targetCard.id,
        };
      }
      return card;
    });
    setMyCards(updatedCards as CardExtended[]);
    setCurrentlyBeingEquipped(null);
    setAmSelectingTargets(false);
    setTargetingPurpose(null);
    setSelectedTargets([]);
    setRequiredTargets(null);
  };
  const handleActivateEffect = (effect: Effect) => {
    if (!myCards) return;

    //TODO: select effect

    if (effect.requiredTargets && !amSelectingTargets) {
      setRequiredTargets(effect.requiredTargets);
      setCurrentEffect(effect);
      setAmSelectingTargets(true);
      return;
    }
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
      opponentDice: opponentDice,
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
    const updateEffectSourceCard = (effectCard: CardExtended) => {
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
        return updateEffectSourceCard(card);
      }
      return card;
    });
    setMyCards(myCurrentCardsWithUpdatedEffectCard as CardExtended[]);

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
  const handleUseAttackEffect = (effect: Effect) => {
    if (!myCards) return;
    let cost = effect.cost;
    let myDiceAfterCost = myDice;
    if (cost) {
      const costModifyingEffects = findCostModifyingEffects(myCards);
      console.log("modifiers", costModifyingEffects);
      costModifyingEffects.forEach((effect) => {
        if (!effect?.execute) return;
        let { modifiedCost, errorMessage } = effect.execute({
          effect,
          playerID: myID,
          myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          //TODO: return?
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
      });

      try {
        myDiceAfterCost = subtractCost(myDice, cost);
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
    }

    // const effectCard = activateCard(card);
    console.log("cost after", cost);
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
      myDice: myDiceAfterCost,
      opponentCards: opponentInGameCards,
      opponentDice: opponentDice,
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

    myUpdatedCards && setMyCards(myUpdatedCards);
    setMyDice(myUpdatedDice || myDiceAfterCost);
    opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
    opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);

    setAmSelectingTargets(false);
    setSelectedTargets([]);
    channel?.send({
      type: "broadcast",
      //TODO: rename event
      event: "effect_executed",
      payload: {
        effect,
        playerID: myID,
        myCards: myUpdatedCards,
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
    gap-2 w-100% p-2 overflow-x-hidden`}
      //TODO: default height
    >
      <div
        className={`${
          isMyBoard && "order-2"
        } bg-blue-200 col-span-full h-32 p-2 grid grid-cols-[4fr_8fr_4fr] `}
      >
        <div></div>
        <div className="flex flex-row justify-center items-center gap-2">
          {playerCards
            ?.filter((card) => card.location === "HAND")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                isFaceDown={!isMyBoard}
                handleClick={() => {
                  if (card.subtype?.includes("EQUIPMENT")) {
                    setCurrentlyBeingEquipped(card);
                    setRequiredTargets(1);
                    setTargetingPurpose("EQUIP");
                    setAmSelectingTargets(true);
                  } else {
                    handleActivateEffect(card.effects[0]);
                  }
                }}
              />
            ))}
          {amSelectingTargets && isMyBoard && (
            <TargetSelectionOptions
              handleEquipCard={handleEquipCard}
              handleUseAttackEffect={handleUseAttackEffect}
              handleActivateEffect={handleActivateEffect}
              errorMessage={errorMessage}
            />
          )}
        </div>
        {/* //TODO: display dice, move to new component, fix overflow */}
        <div className="flex justify-between gap-2 overflow-hidden">
          {isMyBoard && (
            <>
              {attacks?.map((attack) => (
                <CardAttackInfo playerID={playerID} attack={attack} />
              ))}
            </>
          )}
        </div>
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
                !card.subtype.includes("EQUIPMENT")
            )
            .map((card) => (
              <Card
                isFaceDown={false}
                key={card.id}
                card={card}
                handleClick={() => {
                  if (amSelectingTargets) {
                    handleSelectCard(card);
                    return;
                  }
                }}
              />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-40">
        character zone
        <div className="flex flex-row justify-evenly gap-2 px-2">
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => {
              const equippedCards = findEquippedCards(card, playerCards);
              return (
                <Card
                  key={card.id}
                  card={card}
                  equippedCards={equippedCards}
                  handleClick={() => {
                    if (amSelectingTargets) {
                      handleSelectCard(card);
                      return;
                    }
                    //TODO: only enable in certain phase
                    isMyBoard && handleSwitchCharacter(card);
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
      {/* //TODO: display dice */}
      <div className="bg-yellow-50 h-full overflow-hidden">
        {Object.entries(playerDice)
          .sort()
          .map(([element, amount]) => (
            <span className="text-sm" key={element + playerID}>
              {element}:{amount}
              <br />
            </span>
          ))}
      </div>
    </div>
  );
}
