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
  summonsState,
  currentRoundState,
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
import { findEffectLogic } from "@/app/cardEffects";
import { getCreationDisplayComponentForCard } from "./CreationDisplay";

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
  const [mySelectedDice, setMySelectedDice] =
    useRecoilState(mySelectedDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);

  const [selectedTargetCards, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);

  const [selectionPurpose, setSelectionPurpose] = useRecoilState(
    selectionPurposeState
  );

  const summons = useRecoilValue(summonsState);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentRound = useRecoilValue(currentRoundState);

  const isMyBoard = playerID === myID;
  const playerCards = isMyBoard ? myCards : opponentInGameCards;
  const playerDice = isMyBoard ? myDice : opponentDice;
  const attacks = useRecoilValue(currentActiveCharacterAttacksState);

  useEffect(() => {
    if (!gameID || !myID) return;
    const supabase = createClientComponentClient<Database>();
    const ch = supabase
      .channel("game-cards:" + gameID)
      //TODO: give this a more specific name
      .on("broadcast", { event: "state_update" }, ({ payload }) => {
        const { effect, myCards, myDice, opponentCards, opponentDice } =
          payload;
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

  const handleSwitchCharacter = (card: CardExt) => {
    if (!myCards) return;

    const hasActiveCharacter = myCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    //TODO: will myCards have the most recent state?
    let myUpdatedCards = myCards;
    let opponentUpdatedCards = opponentInGameCards;
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
      let cost = mySelectedDice;
      if (calculateTotalDice(mySelectedDice) !== 1) {
        setErrorMessage("Incorrect number of dice");
        return;
      }
      const {
        errorMessage,
        myUpdatedCards: myUpdatedCardsAfterSwitch,
        switchedFrom,
        switchedTo,
      } = switchActiveCharacterCard(myCards, card);

      if (errorMessage) {
        setErrorMessage(errorMessage);
        return;
      }
      if (myUpdatedCardsAfterSwitch) {
        myUpdatedCards = myUpdatedCardsAfterSwitch;
      }

      const effectsThatTriggerOnSwitch = findEffectsThatTriggerOn(
        "SWITCH_CHARACTER",
        myUpdatedCards,
        {
          includeCostModifiers: true,
        }
      );
      console.log("effectsThatTriggerOnSwitch", effectsThatTriggerOnSwitch);
      effectsThatTriggerOnSwitch.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (!effectLogic?.execute) return;
        const {
          myUpdatedCards: myUpdatedCardsAfterEffectsTriggeredOnSwitch,
          opponentUpdatedCards:
            opponentUpdatedCardsAfterEffectsTriggeredOnSwitch,
          modifiedCost,
          errorMessage,
        } = effectLogic.execute({
          effect,
          playerID: myID,
          myCards: myUpdatedCards || myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          summons,
          triggerContext: {
            eventType: "SWITCH_CHARACTER",
            cost,
            switched: {
              from: switchedFrom,
              to: switchedTo,
            },
          },
          currentRound,
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
        if (myUpdatedCardsAfterEffectsTriggeredOnSwitch) {
          myUpdatedCards = myUpdatedCardsAfterEffectsTriggeredOnSwitch;
        }
        if (opponentUpdatedCardsAfterEffectsTriggeredOnSwitch) {
          opponentUpdatedCards =
            opponentUpdatedCardsAfterEffectsTriggeredOnSwitch;
        }
      });
      try {
        const diceAfterCost = subtractCost(myDice, cost);
        setMyDice(diceAfterCost);
        setMySelectedDice({});
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
      myUpdatedCards && setMyCards(myUpdatedCards);
      opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
      channel?.send({
        type: "broadcast",
        event: "state_update",
        payload: {
          playerID: myID,
          myCards: myUpdatedCards,
          myDice,
          opponentCards: opponentUpdatedCards,
          opponentDice,
        },
      });
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
    if (!myCards) return;
    if (!mySelectedDice) return;
    if (selectedTargetCards.length !== 1) {
      setErrorMessage("Incorrect number of targets");
      return;
    }
    const targetCard = selectedTargetCards[0];
    //TODO: compare selectedDice to cardToEquip.cost
    if (cardToEquip.cost) {
      let updatedDice = null;
      try {
        //TODO: fix this
        const difference = subtractCost(mySelectedDice, cardToEquip.cost);
        if (
          Object.keys(difference).length === 0 ||
          Object.values(difference).every((val) => val === 0)
        ) {
          updatedDice = subtractCost(myDice, mySelectedDice);
        }
        setMySelectedDice({});
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

  //TODO: why is this not used?
  const handleActivateEffect = (effect: Effect) => {
    if (!myCards) return;

    //regular effects don't have a cost, the cost of a card's activation is not handled here
    //TODO: what if I try activating a card but could't use its effect?
    //an effect won't change anything until the state is updated with its return values,
    //so the execute function itself can be used to check if the effect can be executed and checkIfCanBeExecuted may not be needed
    //TODO: effect selection
    //TODO: do I need to check if effect can be executed or just return an error message when executing effect?
    const effectLogic = findEffectLogic(effect);
    if (effectLogic.checkIfCanBeExecuted) {
      const { errorMessage: executionErrorMessage } =
        effectLogic.checkIfCanBeExecuted({
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
      currentRound,
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
      event: "state_update",
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
  const activateAttackEffect = (attackEffect: Effect) => {
    if (!myCards) return;
    const attackerCard = myCards.find((c) => c.id === attackEffect.card_id);
    console.log(attackerCard);

    if (attackEffect.effectType === "ELEMENTAL_BURST") {
      if (!attackerCard) {
        setErrorMessage("No effect card");
        return;
      }
      if (attackerCard.location !== "CHARACTER") {
        setErrorMessage("Effect card not a character");
        return;
      }
      //TODO: uncomment this
      // if (effectCard.energy !== effectCard.max_energy) {
      //   setErrorMessage("Not enough energy");
      //   return;
      // }
    }

    const effectLogic = findEffectLogic(attackEffect);
    if (effectLogic.requiredTargets) {
      if (!selectedTargetCards) {
        setErrorMessage("No target selected");
        return;
      }
      if (selectedTargetCards.length !== effectLogic.requiredTargets) {
        setErrorMessage("Incorrect number of targets");
        return;
      }
    }
    //attack effects have a cost
    //removing energy from cost
    //TODO: remove energy from cost in db
    let cost =
      attackEffect.cost &&
      Object.fromEntries(
        Object.entries(attackEffect.cost).filter(
          ([key, value]) => key != "ENERGY"
        )
      );
    let myDiceAfterCost = myDice;
    if (cost) {
      const costModifyingEffects = findCostModifyingEffects(myCards);
      costModifyingEffects.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (!effectLogic?.execute) return;
        let { modifiedCost, errorMessage } = effectLogic.execute({
          summons,
          effect,
          thisCard: attackerCard,
          playerID: myID,
          myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          triggerContext: {
            eventType: "ATTACK",
            cost: cost,
            attack: {
              attackerCard,
              attackBaseEffectID: attackEffect.effect_basic_info_id,
            },
          },
          currentRound,
        });
        console.log("COST MOD", cost, effectLogic, modifiedCost, errorMessage);
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
      });
      try {
        //checking if there are enough dice among the selected dice
        if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
          throw new Error("Incorrect dice amount");
        }
        //subtracting the cost from the selected dice to check if the dice are correct
        subtractCost(mySelectedDice, cost);
      } catch (e) {
        setErrorMessage("Incorrect dice amount");
        return;
      }
      //if there are enough dice, subtract the selected dice from the total dice
      try {
        myDiceAfterCost = subtractCost(myDice, mySelectedDice);
      } catch (e) {
        setErrorMessage("Not enough total dice");
        return;
      }
    }

    // const effectCard = activateCard(card);
    let {
      myUpdatedCards,
      myUpdatedDice,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
    } = activateEffect({
      playerID: myID,
      effect: attackEffect,
      myCards: myCards,
      summons,
      myDice: myDiceAfterCost,
      opponentCards: opponentInGameCards,
      opponentDice: opponentDice,
      targetCards: selectedTargetCards,
      currentRound,
    });
    if (errorMessage) {
      setErrorMessage(errorMessage);
      return;
    }
    if (attackEffect.effectType === "ELEMENTAL_BURST") {
      if (myUpdatedCards) {
        //setting the energy of the character to 0 after using the burst
        myUpdatedCards = myUpdatedCards.map((c) => {
          if (c.id === attackerCard!.id) {
            return {
              ...c,
              energy: 0,
            };
          }
          return c;
        }) as CardExtended[];
      }
    }
    myUpdatedCards && setMyCards(myUpdatedCards);
    setMyDice(myUpdatedDice || myDiceAfterCost);
    opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
    opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);
    setSelectedTargets([]);
    channel?.send({
      type: "broadcast",
      //TODO: use this event or delete it
      event: "state_update",
      payload: {
        effect: attackEffect,
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
      (effect) => {
        console.log("effect!", effect);
        const effectLogic = findEffectLogic(effect);

        return effectLogic.triggerOn?.includes("THIS_CARD_ACTIVATION");
      }
    );

    thisCardEffectsThatTriggerOnActivation.forEach((effect) => {
      const effectLogic = findEffectLogic(effect);
      if (
        effectLogic.requiredTargets &&
        selectedTargetCards.length !== effectLogic.requiredTargets
      ) {
        setErrorMessage("Incorrect number of targets");
        return;
      }
    });

    //TODO: modified cost
    if (cost) {
      if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
        setErrorMessage("Incorrect number of dice");
        return;
      }
      try {
        updatedDice = subtractCost(myDice, mySelectedDice);
      } catch (e) {
        setErrorMessage("Incorrect dice");
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

    const otherCardEffectsThatTriggerOnActivation = findEffectsThatTriggerOn(
      "CARD_ACTIVATION",
      myCards
    );
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
      console.log("found effects", thisCardEffectsThatTriggerOnActivation);
      [
        ...thisCardEffectsThatTriggerOnActivation,
        ...otherCardEffectsThatTriggerOnActivation,
      ].forEach((effect) => {
        const effectLogic = findEffectLogic(effect);

        if (!effectLogic.execute) return;
        if (effectLogic.checkIfCanBeExecuted) {
          //TODO: is this necessary?
          const { errorMessage } = effectLogic.checkIfCanBeExecuted({
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
        } = effectLogic.execute({
          effect,
          playerID: myID,
          summons,
          myCards: myCardsAfterTriggeredEffects,
          myDice: myDiceAfterTriggeredEffects,
          opponentCards: opponentInGameCardsAfterTriggeredEffects,
          opponentDice: opponentDiceAfterTriggeredEffects,
          currentRound,
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
      setSelectedTargets([]);
      setMySelectedDice({});
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
        <div className="flex flex-row justify-center items-center gap-2 ">
          {playerCards
            ?.filter((card) => card.location === "HAND")
            .map((card) => (
              <Card
                key={card.id}
                card={card}
                handleClick={() => {
                  if (
                    card.subtype?.includes("EQUIPMENT") ||
                    //TODO: should food be equipable?
                    card.subtype === "EVENT_FOOD"
                  ) {
                    handleEquipCard(card);
                  } else {
                    activateCard(card);
                  }
                }}
              />
            ))}
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
                  handleAttack={() => {
                    activateAttackEffect(attack);
                    setMySelectedDice({});
                  }}
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
              const creations = playerCards?.filter(
                (summon) => summon.subtype === "CREATION"
              );
              const creationDisplayElements =
                creations &&
                getCreationDisplayComponentForCard({
                  card,
                  creations,
                });
              return (
                <Card
                  key={card.id}
                  card={card}
                  equippedCards={equippedCards}
                  creationDisplayElements={creationDisplayElements}
                  handleClick={() => {
                    //TODO: only enable in certain phases
                    isMyBoard && handleSwitchCharacter(card);
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        {/* SUMMONS */}
        {playerCards
          ?.filter((card) => card.location === "SUMMON")
          .map((card) => {
            return (
              <Card
                key={card.id}
                card={card}

                //TODO: remove (just for testing)
                // handleClick={() => {
                //   if (!myCards) return;
                //   const effect = card.effects.find((eff) => {
                //     const effectLogic = findEffectLogic(eff);
                //     return effectLogic.triggerOn?.includes("REACTION");
                //   });
                //   if (!effect) return;
                //   const { myUpdatedCards, errorMessage } = activateEffect({
                //     effect,
                //     playerID: myID,
                //     myCards,
                //     myDice,
                //     opponentCards: opponentInGameCards,
                //     opponentDice: opponentDice,
                //     targetCards: selectedTargetCards,
                //     summons,
                //     thisCard: card,
                //     triggerContext: {
                //       eventType: "REACTION",
                //       reaction: {
                //         name: "SWIRL",
                //         resultingElement: "PYRO",
                //       },
                //     },
                //   });
                //   errorMessage && setErrorMessage(errorMessage);
                //   myUpdatedCards && setMyCards(myUpdatedCards);
                //   // effect && myCards && activateAttackEffect(effect);
                // }}
              />
            );
          })}
      </div>
      {/* //TODO: display on cards */}
      {/* <div className="bg-yellow-50 h-full">
        creations:{" "}
        {playerCards
          ?.filter((card) => card.subtype === "CREATION")
          .map((creation) => {
            return (
              <div>
                {creation.name}
                usages: {creation.usages}
              </div>
            );
          })}
      </div> */}
      {/* //TODO: display dice */}
      <DiceDisplay dice={playerDice} isMyBoard={isMyBoard}></DiceDisplay>
      {isMyBoard && <ElementalTuning />}
    </div>
  );
}
