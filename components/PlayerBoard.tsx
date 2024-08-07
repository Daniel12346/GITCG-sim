import {
  currentGameIDState,
  currentPlayerIDState,
  myIDState,
  opponentIDState,
  opponentInGameCardsState,
  myDiceState,
  opponentDiceState,
  mySelectedCardsState,
  myInGameCardsState,
  currentActiveCharacterAttacksState,
  selectionPurposeState,
  mySelectedDiceState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import Card from "./Card";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  activateEffect,
  subtractCost,
  switchActiveCharacterCard,
} from "@/app/actions";
import { CardExtended } from "@/app/global";
import {
  calculateTotalDice,
  findCostModifyingEffects,
  findEffectsThatTriggerOn,
  findEquippedCards,
} from "@/app/utils";
import DiceDisplay from "./DiceDisplay";
import CardAttack from "./CardAttack";
import ElementalTuning from "./ElementalTuning";

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
  const [selectedDice, setSelectedDice] = useRecoilState(mySelectedDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);

  const [selectedTargetCards, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);

  const [selectionPurpose, setSelectionPurpose] = useRecoilState(
    selectionPurposeState
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

  //TODO: change
  // const handleSelectCard = (card: CardExt) => {
  //   //don't select the same card twice
  //   if (
  //     selectedTargetCards.find(
  //       (selected: CardExtended) => selected.id === card.id
  //     )
  //   ) {
  //     return;
  //   }
  //   setSelectedTargets((prev) => [...prev, card]);
  //   console.log("SELECTED", selectedTargetCards);
  // };

  const handleSwitchCharacter = (card: CardExt) => {
    if (!myCards) return;

    const hasActiveCharacter = myCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    //if there is no active character, the card can be switched to active without a cost
    if (!hasActiveCharacter) {
      setMyCards(
        myCards.map((c) => {
          if (c.id === card.id) {
            return { ...c, is_active: true };
          }
          return c;
        }) as CardExtended[]
      );
    } else {
      let cost = selectedDice;
      console.log("switch dice", selectedDice);
      if (calculateTotalDice(selectedDice) !== 1) {
        setErrorMessage("Incorrect number of dice");
        return;
      }
      const { errorMessage, myUpdatedCards } = switchActiveCharacterCard(
        myCards,
        card
      );

      if (errorMessage) {
        setErrorMessage(errorMessage);
        return;
      }

      const costModifyingEffects = findCostModifyingEffects(myCards);
      costModifyingEffects.forEach((effect) => {
        if (!effect?.execute) return;
        let { modifiedCost, errorMessage } = effect.execute({
          effect,
          playerID: myID,
          myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          triggerContext: {
            //TODO: rename to SWITCH_CHARACTER because SWITCH_PLAYER will be used for changing turns
            eventType: "SWITCH",
            cost,
          },
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
      });
      try {
        const diceAfterCost = subtractCost(myDice, cost);
        setMyDice(diceAfterCost);
        setSelectedDice({});
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
      myUpdatedCards && setMyCards(myUpdatedCards);
    }
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

  const handleEquipCard = (cardToEquip: CardExt) => {
    // setCurrentlyBeingEquipped(cardToEquip);
    // setRequiredTargets(1);
    // setSelectionPurpose("EQUIP");
    // setAmSelectingTargets(true);
    console.log("Equipping", selectedDice, selectedTargetCards);
    if (!myCards) return;
    if (!selectedDice) return;
    if (selectedTargetCards.length !== 1) {
      setErrorMessage("Incorrect number of targets");
      return;
    }
    const targetCard = selectedTargetCards[0];
    //TODO: compare selectedDice to cardToEquip.cost
    console.log("selectedDice", selectedDice, "cost", cardToEquip.cost);
    if (cardToEquip.cost) {
      let updatedDice = null;
      try {
        //TODO: fix this
        const difference = subtractCost(selectedDice, cardToEquip.cost);
        console.log("difference", difference);
        if (
          Object.keys(difference).length === 0 ||
          Object.values(difference).every((val) => val === 0)
        ) {
          updatedDice = subtractCost(myDice, selectedDice);
        }
        setSelectedDice({});
      } catch (e) {
        console.log(e);
        setErrorMessage("Incorrect dice");
        return;
      }
      updatedDice && setMyDice(updatedDice);
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
    setSelectionPurpose(null);
    setSelectedTargets([]);
  };

  const handleActivateEffect = (effect: Effect) => {
    if (!myCards) return;

    //regular effects don't have a cost, the cost of a card's activation is not handled here
    //TODO: what if I try activating a card but could't use its effect?
    //an effect won't change anything until the state is updated with its return values,
    //so the execute function itself can be used to check if the effect can be executed and checkIfCanBeExecuted may not be needed
    //TODO: effect selection
    //TODO: do I need to check if effect can be executed or just return an error message when executing effect?

    if (effect.checkIfCanBeExecuted) {
      const { errorMessage: executionErrorMessage } =
        effect.checkIfCanBeExecuted({
          playerID: myID,
          myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          targetCards: selectedTargetCards,
        });
      if (executionErrorMessage) {
        setErrorMessage(executionErrorMessage);
        return;
      }
    }

    // if (effect.requiredTargets && !amSelectingTargets) {
    //   setRequiredTargets(effect.requiredTargets);
    //   setCurrentEffect(effect);
    //   setSelectionPurpose("EFFECT");
    //   setAmSelectingTargets(true);
    //   return;
    // }

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
      //if an error occurs, effect execution is stopped
      setErrorMessage(errorMessage);
      return;
    }
    const effectSourceCard = myCards.find((c) => c.id === effect.card_id);
    if (!effectSourceCard) {
      console.log("no effect card");
      return;
    }
    //if the effect was activated from the hand, it should be moved to the action zone
    let newLocation = effectSourceCard.location;
    let wasActivatedThisTurn = effectSourceCard.wasActivatedThisTurn;
    if (effectSourceCard.location === "HAND") {
      newLocation = "ACTION";
      wasActivatedThisTurn = true;
      //TODO: check all effects that activate on card activation
    }
    //updating the the effect whose effect was activated
    const updateEffectSourceCard = (effectSourceCard: CardExtended) => {
      return {
        ...effectSourceCard,
        location: newLocation,
        wasActivatedThisTurn,
        effects: effectSourceCard.effects.map((eff) => {
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
      if (card.id === effectSourceCard.id) {
        return updateEffectSourceCard(card);
      }
      return card;
    });
    setMyCards(myCurrentCardsWithUpdatedEffectCard as CardExtended[]);

    opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
    myUpdatedDice && setMyDice(myUpdatedDice);
    opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);
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
  const activateAttackEffect = (effect: Effect) => {
    if (!myCards) return;
    if (effect.requiredTargets) {
      if (!selectedTargetCards) {
        setErrorMessage("No target selected");
        return;
      }
      if (selectedTargetCards.length !== effect.requiredTargets) {
        setErrorMessage("Incorrect number of targets");
        return;
      }
    }
    //attack effects have a cost
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
          triggerContext: {
            eventType: "ATTACK",
            cost: cost,
          },
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
      });
      console.log("cost", cost);
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
    setSelectedTargets([]);
    channel?.send({
      type: "broadcast",
      //TODO: use this event or delete it
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
  //TODO: make equipping work with this
  const activateCard = (card: CardExt) => {
    // if (card.subtype?.includes("EQUIPMENT")) {
    //   setCurrentlyBeingEquipped(card);
    //   setRequiredTargets(1);
    //   setSelectionPurpose("EQUIP");
    //   setAmSelectingTargets(true);
    //   return;
    // }
    if (!myCards) return;
    let updatedDice = null;
    let cost = card.cost;
    const thisCardEffectsThatTriggerOnActivation = card.effects.filter(
      (effect) => effect.triggerOn?.includes("THIS_CARD_ACTIVATION")
    );
    thisCardEffectsThatTriggerOnActivation.forEach((effect) => {
      if (
        effect.requiredTargets &&
        selectedTargetCards.length !== effect.requiredTargets
      ) {
        setErrorMessage("Incorrect number of targets");
        return;
      }
    });

    if (cost) {
      try {
        updatedDice = subtractCost(myDice, cost);
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
    }
    let updatedCards = myCards.map((c) => {
      if (c.id === card.id) {
        // TODO: set wasActivatedThisTurn to false at the end of the turn
        return { ...c, location: "ACTION", wasActivatedThisTurn: true };
      }
      return c;
    });

    //TODO: check all effects that activate on card activation (here?)
    const otherCardEffectsThatTriggerOnActivation = findEffectsThatTriggerOn(
      "CARD_ACTIVATION",
      myCards
    );
    console.log(thisCardEffectsThatTriggerOnActivation);
    //TODO: how do I update the effect usage count on this and other cards?
    if (
      thisCardEffectsThatTriggerOnActivation.length === 0 &&
      otherCardEffectsThatTriggerOnActivation.length === 0
    ) {
      setMyCards(updatedCards as CardExtended[]);
      setMyDice(updatedDice || myDice);
      return;
    } else {
      //TODO: check if this works
      let myCardsAfterTriggeredEffects = updatedCards as CardExtended[];
      let myDiceAfterTriggeredEffects = updatedDice || {};
      let opponentInGameCardsAfterTriggeredEffects = opponentInGameCards;
      let opponentDiceAfterTriggeredEffects = opponentDice;
      [
        ...thisCardEffectsThatTriggerOnActivation,
        ...otherCardEffectsThatTriggerOnActivation,
      ].forEach((effect) => {
        if (!effect.execute) return;
        if (effect.checkIfCanBeExecuted) {
          //TODO: is this necessary?
          const { errorMessage } = effect.checkIfCanBeExecuted({
            playerID: myID,
            myCards: myCardsAfterTriggeredEffects,
            myDice: myDiceAfterTriggeredEffects,
            opponentCards: opponentInGameCardsAfterTriggeredEffects,
            opponentDice: opponentDiceAfterTriggeredEffects,
            triggerContext: {
              eventType: "CARD_ACTIVATION",
            },
          });
          if (errorMessage) {
            setErrorMessage(errorMessage);
            return;
          }
        }
        const {
          myUpdatedCards,
          myUpdatedDice,
          opponentUpdatedCards,
          opponentUpdatedDice,
          errorMessage,
        } = effect.execute({
          effect,
          playerID: myID,
          myCards: myCardsAfterTriggeredEffects,
          myDice: myDiceAfterTriggeredEffects,
          opponentCards: opponentInGameCardsAfterTriggeredEffects,
          opponentDice: opponentDiceAfterTriggeredEffects,
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        myUpdatedCards &&
          (myCardsAfterTriggeredEffects = myUpdatedCards as CardExtended[]);
        myUpdatedDice && (myDiceAfterTriggeredEffects = myUpdatedDice);
        opponentUpdatedCards &&
          (opponentInGameCardsAfterTriggeredEffects = opponentUpdatedCards);
        opponentUpdatedDice &&
          (opponentDiceAfterTriggeredEffects = opponentUpdatedDice);
      });
      setMyCards(myCardsAfterTriggeredEffects);
      setMyDice(myDiceAfterTriggeredEffects);
      setOpponentInGameCards(opponentInGameCardsAfterTriggeredEffects);
      setOpponentDice(opponentDiceAfterTriggeredEffects);
    }
  };

  return (
    <div
      className={`${
        isMyBoard ? "bg-green-400" : "bg-red-400"
      } grid grid-cols-[10%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_10%] 
    gap-2 w-100% p-2 overflow-x-hidden`}
    >
      <div
        className={`${
          isMyBoard && "order-2"
        } bg-blue-200 col-span-full h-32 p-2 grid grid-cols-[4fr_8fr_4fr] `}
      >
        <div className="text-red-700">{errorMessage || ""}</div>
        <div className="flex flex-row justify-center items-center gap-2">
          {playerCards
            ?.filter((card) => card.location === "HAND")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                handleClick={() => {
                  if (card.subtype?.includes("EQUIPMENT")) {
                    handleEquipCard(card);
                  } else {
                    activateCard(card);
                  }
                }}
              />
            ))}
          {/* {amSelectingTargets && isMyBoard && (
            <TargetSelectionOptions
              handleEquipCard={handleEquipCard}
              activateAttackEffect={activateAttackEffect}
              handleActivateEffect={handleActivateEffect}
              errorMessage={errorMessage}
            />
          )} */}
        </div>
        {/* //TODO: display dice, move to new component, fix overflow */}
        <div className="flex justify-between gap-2 overflow-hidden">
          {isMyBoard && (
            <>
              {attacks?.map((attack) => (
                <CardAttack
                  key={attack.id}
                  playerID={playerID}
                  attack={attack}
                  handleAttack={() => activateAttackEffect(attack)}
                />
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
              <Card key={card.id} card={card} />
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
                    //TODO: only enable in certain phases
                    isMyBoard && handleSwitchCharacter(card);
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
      {/* //TODO: display dice */}
      <DiceDisplay dice={playerDice} isMyBoard={isMyBoard}></DiceDisplay>
      {isMyBoard && <ElementalTuning />}
    </div>
  );
}
