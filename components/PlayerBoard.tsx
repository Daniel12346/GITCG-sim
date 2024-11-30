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
  mySelectedDiceState,
  summonsState,
  currentRoundState,
  isMyTurnState,
  currentPhaseState,
  errorMessageState,
  currentHighlightedCardState,
  usedAttackState,
  opponentProfileState,
  myProfileState,
  isOpponentReadyForNextPhaseState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import CardInGame from "./CardInGame";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  activateEffect,
  subtractCost,
  switchActiveCharacterCard,
} from "@/app/actions";
import { CardExtended, CostT } from "@/app/global";
import {
  broadcastSwitchPlayer,
  subtractCostAfterModifiers,
  calculateTotalDice,
  findCostModifyingEffects,
  findEffectsThatTriggerOn,
  findEquippedCards,
} from "@/app/utils";
import DiceDisplay from "./DiceDisplay";
import CardAttack from "./CardAttack";
import { findEffectLogic } from "@/app/cardEffects";
import { getCreationDisplayComponentForCard } from "./CreationDisplay";
import DiceReroll from "./DiceReroll";
import CardRedraw from "./CardRedraw";
import GameOver from "./GameOver";
import PlayerBannerInGame from "./PlayerBannerInGame";

//TODO: move to another file
interface PlayerBoardProps {
  playerID?: string;
}
interface UpdatedCardsAndDicePayload {
  myCards?: CardExtended[];
  opponentCards?: CardExtended[];
  myDice?: Dice;
  opponentDice?: Dice;
  highlightedCard?: CardExtended;
  usedAttack?: Attack;
}
export default function PlayerBoard({ playerID }: PlayerBoardProps) {
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const currentPhase = useRecoilValue(currentPhaseState);
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

  const summons = useRecoilValue(summonsState);

  const [errorMessage, setErrorMessage] = useRecoilState(errorMessageState);
  const currentRound = useRecoilValue(currentRoundState);

  const isMyBoard = playerID === myID;
  const playerCards = isMyBoard ? myCards : opponentInGameCards;
  const playerDice = isMyBoard ? myDice : opponentDice;
  const attacks = useRecoilValue(currentActiveCharacterAttacksState);
  const isMyTurn = useRecoilValue(isMyTurnState);
  const cardsInDeck = playerCards.filter((card) => card.location === "DECK");
  const setHighlightedCard = useSetRecoilState(currentHighlightedCardState);
  const [usedAttack, setUsedAttack] = useRecoilState(usedAttackState);
  //TODO: handle better
  const myProfile = useRecoilValue(myProfileState);
  const opponentProfile = useRecoilValue(opponentProfileState);
  const playerProfile = isMyBoard ? myProfile : opponentProfile;
  const isOpponentReadyForNextPhase = useRecoilValue(
    isOpponentReadyForNextPhaseState
  );
  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    const channel = supabase.channel("game-updates:" + gameID, {
      config: { presence: { key: myID } },
    });
    channel
      .on("presence", { event: "join" }, ({ key }) => {
        //TODO:
      })
      .on("broadcast", { event: "switch_player" }, ({ payload }) => {
        const { playerID } = payload;
        setCurrentPlayerID(playerID);
      })
      .on("broadcast", { event: "updated_cards_and_dice" }, ({ payload }) => {
        const {
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          highlightedCard,
          usedAttack,
        } = payload as UpdatedCardsAndDicePayload;
        myCards && setOpponentInGameCards(myCards);
        opponentCards && setMyCards(opponentCards);
        myDice && setOpponentDice(myDice);
        opponentDice && setMyDice(opponentDice);
        highlightedCard && setHighlightedCard(highlightedCard);
        if (usedAttack) {
          setUsedAttack(usedAttack);
          setTimeout(() => {
            setUsedAttack(null);
          }, 1500);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            online_at: new Date().toISOString(),
            cards: myCards,
          });
          console.log("player boards", presenceTrackStatus);
        }
      });
    setChannel(channel);
    return () => {
      console.log("unsubscribing in turn and phase");
      setChannel(null);
      supabase.removeChannel(channel);
    };
  }, []);
  const handleSwitchCharacter = async (
    card: CardExt,
    {
      phase,
    }: {
      phase: PhaseName | null;
    }
  ) => {
    if (!myCards) return;
    const hasActiveCharacter = myCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    let myUpdatedCards = myCards;
    let opponentUpdatedCards = opponentInGameCards;
    //if there is no active character or the active character was defeated, the card can be switched to active without a cost
    const activeCharacter = myUpdatedCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    if (!hasActiveCharacter || activeCharacter?.health === 0) {
      myUpdatedCards = myCards.map((c) => {
        if (c.id === card.id) {
          return { ...c, is_active: true };
        }
        return c;
      }) as CardExtended[];
      const res = await channel?.send({
        type: "broadcast",
        event: "updated_cards_and_dice",
        payload: {
          myCards: myUpdatedCards,
          highlightedCard: card,
        },
      });
      setHighlightedCard(card);
      setMyCards(
        (prev) =>
          prev.map((c) => {
            if (c.id === card.id) {
              return { ...c, is_active: true };
            }
            return c;
          }) as CardExtended[]
      );
    } else {
      //the default cost of switching a character is 1 UNALIGNED die
      if (phase === "PREPARATION_PHASE") {
        setErrorMessage("Cannot switch character in preparation phase");
        return;
      }
      let cost: CostT = { UNALIGNED: 1 };
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
      //switching character is not a fast action by default
      let isSwitchFastAction = false;
      if (switchedFrom?.health === 0) {
        //switching from a defeated character is a fast action
        isSwitchFastAction = true;
      }
      effectsThatTriggerOnSwitch.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (!effectLogic?.execute) return;
        const {
          myUpdatedCards: myUpdatedCardsAfterEffectsTriggeredOnSwitch,
          opponentUpdatedCards:
            opponentUpdatedCardsAfterEffectsTriggeredOnSwitch,
          modifiedCost,
          errorMessage,
          isFastAction,
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
        if (isFastAction !== undefined) {
          isSwitchFastAction = isFastAction;
        }
      });
      if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
        setErrorMessage("Incorrect number of dice");
        return;
      }
      let diceAfterCost;
      try {
        diceAfterCost = subtractCost(myDice, cost);
        setMyDice(diceAfterCost);
        setMySelectedDice({});
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
      myUpdatedCards && setMyCards(myUpdatedCards);
      opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
      setHighlightedCard(card);
      channel
        ?.send({
          type: "broadcast",
          event: "updated_cards_and_dice",
          payload: {
            highlightedCard: card,
            myCards: myUpdatedCards,
            myDice: diceAfterCost,
            opponentCards: opponentUpdatedCards,
          },
        })
        //TODO: combine into one broadcast
        .then(() => {
          //passing the turn to the opponent if the switch was not a fast action
          if (!isSwitchFastAction && !isOpponentReadyForNextPhase) {
            setCurrentPlayerID(opponentID);
            setTimeout(() => {
              channel
                ?.send({
                  type: "broadcast",
                  event: "switch_player",
                  payload: {
                    playerID: opponentID,
                  },
                })
                .then((res) => {
                  console.log("switched player", res);
                });
            }, 400);
          }
        });
    }
  };

  // //TODO: why is this not used?
  // const handleActivateEffect = (effect: Effect) => {
  //   if (!myCards) return;

  //   //regular effects don't have a cost, the cost of a card's activation is not handled here
  //   //TODO: what if I try activating a card but could't use its effect?
  //   //an effect won't change anything until the state is updated with its return values,
  //   //so the execute function itself can be used to check if the effect can be executed and checkIfCanBeExecuted may not be needed
  //   //TODO: effect selection
  //   //TODO: do I need to check if effect can be executed or just return an error message when executing effect?
  //   const effectLogic = findEffectLogic(effect);
  //   // if (effectLogic.checkIfCanBeExecuted) {
  //   //   const { errorMessage: executionErrorMessage } =
  //   //     effectLogic.checkIfCanBeExecuted({
  //   //       playerID: myID,
  //   //       myCards,
  //   //       myDice,
  //   //       opponentCards: opponentInGameCards,
  //   //       opponentDice: opponentDice,
  //   //       targetCards: selectedTargetCards,
  //   //     });
  //   //   if (executionErrorMessage) {
  //   //     setErrorMessage(executionErrorMessage);
  //   //     return;
  //   //   }
  //   // }

  //   // if (effect.requiredTargets && !amSelectingTargets) {
  //   //   setRequiredTargets(effect.requiredTargets);
  //   //   setCurrentEffect(effect);
  //   //   setSelectionPurpose("EFFECT");
  //   //   setAmSelectingTargets(true);
  //   //   return;
  //   // }

  //   const {
  //     myUpdatedCards,
  //     myUpdatedDice,
  //     opponentUpdatedCards,
  //     opponentUpdatedDice,
  //     errorMessage,
  //   } = activateEffect({
  //     playerID: myID,
  //     effect,
  //     myCards: myCards,
  //     myDice,
  //     opponentCards: opponentInGameCards,
  //     opponentDice: opponentDice,
  //     targetCards: selectedTargetCards,
  //     currentRound,
  //   });
  //   if (errorMessage) {
  //     //if an error occurs, effect execution is stopped
  //     setErrorMessage(errorMessage);
  //     return;
  //   }
  //   const effectSourceCard = myCards.find((c) => c.id === effect.card_id);
  //   if (!effectSourceCard) {
  //     console.log("no effect card");
  //     return;
  //   }
  //   //if the effect was activated from the hand, it should be moved to the action zone
  //   let newLocation = effectSourceCard.location;
  //   let wasActivatedThisTurn = effectSourceCard.wasActivatedThisTurn;
  //   if (effectSourceCard.location === "HAND") {
  //     newLocation = "ACTION";
  //     wasActivatedThisTurn = true;
  //     //TODO: check all effects that activate on card activation
  //   }
  //   //updating the the effect whose effect was activated
  //   const updateEffectSourceCard = (effectSourceCard: CardExtended) => {
  //     return {
  //       ...effectSourceCard,
  //       location: newLocation,
  //       wasActivatedThisTurn,
  //       effects: effectSourceCard.effects.map((eff) => {
  //         return {
  //           ...eff,
  //           total_usages: eff.total_usages ? eff.total_usages + 1 : 0,
  //           usages_this_turn: eff.usages_this_turn
  //             ? eff.usages_this_turn + 1
  //             : 0,
  //         };
  //       }),
  //     };
  //   };
  //   //the most recent card state
  //   const myCurrentCards = myUpdatedCards || myCards;
  //   const myCurrentCardsWithUpdatedEffectCard = myCurrentCards.map((card) => {
  //     if (card.id === effectSourceCard.id) {
  //       return updateEffectSourceCard(card);
  //     }
  //     return card;
  //   });
  //   setMyCards(myCurrentCardsWithUpdatedEffectCard as CardExtended[]);

  //   opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
  //   myUpdatedDice && setMyDice(myUpdatedDice);
  //   opponentUpdatedDice && setOpponentDice(opponentUpdatedDice);
  //   setSelectedTargets([]);
  //   channel?.send({
  //     type: "broadcast",
  //     event: "updated_cards_and_dice",
  //     payload: {
  //       myCards: myCurrentCardsWithUpdatedEffectCard,
  //       myDice: myUpdatedDice,
  //       opponentCards: opponentUpdatedCards,
  //       opponentDice: opponentUpdatedDice,
  //     },
  //   });
  // };
  const activateAttackEffect = (attackEffect: Effect) => {
    if (!myCards) return;
    const attackerCard = myCards.find((c) => c.id === attackEffect.card_id);
    if (attackEffect.effectType === "ELEMENTAL_BURST") {
      if (!attackerCard) {
        return { errorMessage: "No attacker card found" };
      }
      if (attackerCard.location !== "CHARACTER") {
        return { errorMessage: "Effect card not a character" };
      }
      if (attackerCard.energy !== attackerCard.max_energy) {
        setErrorMessage("Not enough energy");
        return;
      }
    }
    //the target of the attack is the opponent's active character
    const opponentActiveCharacter = opponentInGameCards.find(
      (c) => c.location === "CHARACTER" && c.is_active
    );
    if (!opponentActiveCharacter) {
      return { errorMessage: "No target found" };
    }

    //TODO!: remove this if all attacks always attack the active character
    // const attackEffectLogic = findEffectLogic(attackEffect);
    // if (attackEffectLogic.requiredTargets) {
    //   if (!selectedTargetCards) {
    //     return { errorMessage: "No target selected" };
    //   }
    //   if (selectedTargetCards.length !== attackEffectLogic.requiredTargets) {
    //     return { errorMessage: "Incorrect number of targets" };
    //   }
    // }
    //attack effects have a cost
    //TODO: remove energy from cost in db
    let cost =
      attackEffect.cost &&
      Object.fromEntries(
        Object.entries(attackEffect.cost).filter(
          ([key, value]) => key != "ENERGY"
        )
      );
    let myDiceAfterCost = myDice;
    let myUpdatedCards = myCards;
    if (cost) {
      const costModifyingEffects = findCostModifyingEffects(myCards);
      //execute all cost modifying effects
      costModifyingEffects.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (!effectLogic?.execute) return;
        let {
          modifiedCost,
          errorMessage,
          myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
        } = effectLogic.execute({
          summons,
          effect,
          playerID: myID,
          myCards: myUpdatedCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          triggerContext: {
            eventType: "ATTACK",
            cost,
            attack: {
              attackerCard,
              attackBaseEffectID: attackEffect.effect_basic_info_id,
            },
          },
          currentRound,
        });

        if (errorMessage) {
          return { errorMessage };
        }
        if (myUpdatedCardsAfterCostModifyingEffect) {
          myUpdatedCards = myUpdatedCardsAfterCostModifyingEffect;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
      });
      try {
        //checking if there are enough dice among the selected dice
        if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
          return { errorMessage: "Incorrect number of dice" };
        }
        //subtracting the cost from the selected dice to check if the dice are correct
        subtractCost(mySelectedDice, cost);
      } catch (e) {
        return { errorMessage: "Incorrect dice" };
      }
      //if there are enough dice, subtract the selected dice from the total dice
      try {
        myDiceAfterCost = subtractCost(myDice, mySelectedDice);
      } catch (e) {
        return { errorMessage: "Not enough total dice" };
      }
    }
    //execute the attack effect
    let {
      myUpdatedCards: myUpdatedCardsAfterAttackEffect,
      myUpdatedDice,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
    } = activateEffect({
      playerID: myID,
      effect: attackEffect,
      myCards: myUpdatedCards,
      summons,
      myDice: myDiceAfterCost,
      opponentCards: opponentInGameCards,
      opponentDice: opponentDice,
      targetCards: [opponentActiveCharacter],
      currentRound,
    });
    if (myUpdatedCardsAfterAttackEffect) {
      myUpdatedCards = myUpdatedCardsAfterAttackEffect;
    }
    if (errorMessage) {
      return { errorMessage };
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
    return {
      myUpdatedCards,
      myUpdatedDice: myUpdatedDice || myDiceAfterCost,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
      attackerCard,
      targetCard: opponentActiveCharacter,
    };
  };
  //TODO: make equipping work with this
  const activateCard = (card: CardExt) => {
    //weapon and artifact cards
    if (!myCards) return;
    const isEquipment = card.subtype?.includes("EQUIPMENT");
    const isFood = card.subtype === "EVENT_FOOD";
    //location and companion cards
    const isSupport = card.subtype?.includes("SUPPORT");
    let myUpdatedCards = myCards;
    let myUpdatedDice = myDice;
    let opponentUpdatedCards = opponentInGameCards;
    let opponentUpdatedDice = opponentDice;
    let thisCardEffectsThatTriggerOnThisCardActivation: Effect[] = [];

    if ((isEquipment || isFood) && selectedTargetCards.length !== 1) {
      setErrorMessage("Incorrect number of targets");
      return;
    }
    if (card.subtype === "EQUIPMENT_ARTIFACT") {
      const selectedTargetCard = selectedTargetCards[0];
      const cardsEquippedToTarget = findEquippedCards(
        selectedTargetCard,
        myUpdatedCards,
        "EQUIPMENT_ARTIFACT"
      );
      if (cardsEquippedToTarget.length == 1) {
        setErrorMessage("Target already has a relic equipped");
        return;
      }
    }
    try {
      thisCardEffectsThatTriggerOnThisCardActivation = card.effects.filter(
        (effect) => {
          const effectLogic = findEffectLogic(effect);
          return effectLogic.triggerOn?.includes("THIS_CARD_ACTIVATION");
        }
      );

      thisCardEffectsThatTriggerOnThisCardActivation.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (
          effectLogic.requiredTargets &&
          selectedTargetCards.length !== effectLogic.requiredTargets
        ) {
          throw new Error("Incorrect number of targets");
        }
      });
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }

    if (isSupport) {
      const cardToDiscard = selectedTargetCards[0];
      if (myUpdatedCards?.filter((c) => c.location === "ACTION").length >= 4) {
        if (
          selectedTargetCards.length === 1 &&
          cardToDiscard.location === "ACTION" &&
          cardToDiscard.owner_id === myID
        ) {
          myUpdatedCards = myUpdatedCards.map((c) => {
            if (c.id === cardToDiscard.id) {
              return {
                ...c,
                location: "DISCARDED",
              };
            }
            return c;
          });
        } else {
          setErrorMessage("You need to discard a card from the action zone");
          return;
        }
      }
    }

    let cost = card.cost;
    try {
      if (cost) {
        const costModifyingEffects = findCostModifyingEffects(myCards);
        //execute all cost modifying effects
        costModifyingEffects.forEach((effect) => {
          const effectLogic = findEffectLogic(effect);
          if (!effectLogic?.execute) return;
          let {
            modifiedCost,
            errorMessage,
            myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
          } = effectLogic.execute({
            summons,
            effect,
            playerID: myID,
            myCards: myUpdatedCards,
            myDice,
            opponentCards: opponentUpdatedCards,
            opponentDice: opponentUpdatedDice,
            triggerContext: {
              eventType: "CARD_ACTIVATION",
              cost,
              activatedCard: card,
            },
            currentRound,
          });

          if (errorMessage) {
            throw new Error(errorMessage);
          }
          if (myUpdatedCardsAfterCostModifyingEffect) {
            myUpdatedCards = myUpdatedCardsAfterCostModifyingEffect;
          }
          if (modifiedCost) {
            cost = modifiedCost;
          }
        });
        try {
          //checking if there are enough dice among the selected dice
          if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
            throw new Error("Incorrect number of dice");
          }
          //subtracting the cost from the selected dice to check if the dice are correct
          subtractCost(mySelectedDice, cost);
        } catch (e) {
          throw new Error("Incorrect dice");
        }
        //if there are enough dice, subtract the selected dice from the total dice
        try {
          myUpdatedDice = subtractCost(myUpdatedDice, mySelectedDice);
        } catch (e) {
          throw new Error("Not enough total dice");
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }

    if (card.cost) {
      const {
        modifiedCost,
        myUpdatedCards: myUpdatedCardsAfterCostModifiers,
        myUpdatedDice: myUpdatedDiceAfterCostModifiers,
        errorMessage,
      } = subtractCostAfterModifiers({
        baseCost: card.cost,
        selectedDice: mySelectedDice,
        executeArgs: {
          summons,
          playerID: myID,
          myCards: myUpdatedCards,
          myDice,
          opponentCards: opponentUpdatedCards,
          opponentDice: opponentUpdatedDice,
          triggerContext: {
            eventType: "CARD_ACTIVATION",
            cost,
            activatedCard: card,
          },
          currentRound,
        },
      });
      if (modifiedCost) {
        cost = modifiedCost;
      }
      if (myUpdatedCardsAfterCostModifiers) {
        myUpdatedCards = myUpdatedCardsAfterCostModifiers;
      }
      if (myUpdatedDiceAfterCostModifiers) {
        myUpdatedDice = myUpdatedDiceAfterCostModifiers;
      }
      if (errorMessage) {
        setErrorMessage(errorMessage);
        return;
      }
    }

    myUpdatedCards = myCards.map((c) => {
      if (c.id === card.id) {
        const location: CardExt["location"] = isEquipment
          ? "EQUIPPED"
          : card.subtype === "EVENT_FOOD" || card.subtype === "EVENT_BASIC"
          ? "DISCARDED"
          : "ACTION";
        const equippedTo =
          isEquipment || isFood ? selectedTargetCards[0].id : null;
        // TODO: set wasActivatedThisTurn to false at the end of the turn
        return { ...c, location, wasActivatedThisTurn: true, equippedTo };
      }
      return c;
    });

    const myOtherCardEffectsThatTriggerOnCardActivation =
      findEffectsThatTriggerOn(
        "CARD_ACTIVATION",
        myCards,
        //cost modifers will be handled separately before the other effects are executed
        { includeCostModifiers: false }
      );

    //TODO: how do I update the effect usage count on this and other cards?

    try {
      if (
        thisCardEffectsThatTriggerOnThisCardActivation.length !== 0 ||
        myOtherCardEffectsThatTriggerOnCardActivation.length !== 0
      ) {
        //   setMyCards(myUpdatedCards);
        //   setMyDice(myUpdatedDice);
        //   channel?.send({
        //     type: "broadcast",
        //     event: "updated_cards_and_dice",
        //     payload: {
        //       myCards: myUpdatedCards,
        //       myDice: myUpdatedDice,
        //     },
        //   });
        //   return;
        // } else {
        //TODO: fix
        // const { errorMessage, myUpdatedCards, myUpdatedDice } =
        //   executeEffectsSequentially({
        //     effects: [
        //       ...thisCardEffectsThatTriggerOnThisCardActivation,
        //       ...myOtherCardEffectsThatTriggerOnCardActivation,
        //     ],
        //     executeArgs: {
        //       playerID: myID,
        //       myCards: myUpdatedCards,
        //       myDice: myUpdatedDice,
        //       opponentCards: opponentUpdatedCards,
        //       opponentDice: opponentUpdatedDice,
        //       summons,
        //       triggerContext: {
        //         eventType: "CARD_ACTIVATION",
        //       },
        //       currentRound,
        //     },
        //   });
        //TODO: check if this works
        [
          ...(thisCardEffectsThatTriggerOnThisCardActivation || []),
          ...(myOtherCardEffectsThatTriggerOnCardActivation || []),
        ].forEach((effect) => {
          const effectLogic = findEffectLogic(effect);

          if (!effectLogic.execute) return;
          //   //TODO: is this necessary?
          // if (effectLogic.checkIfCanBeExecuted) {
          //   const { errorMessage } = effectLogic.checkIfCanBeExecuted({
          //     playerID: myID,
          //     myCards: myCardsAfterTriggeredEffects,
          //     myDice: myDiceAfterTriggeredEffects,
          //     opponentCards: opponentInGameCardsAfterTriggeredEffects,
          //     opponentDice: opponentDiceAfterTriggeredEffects,
          //     triggerContext: {
          //       eventType: "CARD_ACTIVATION",
          //     },
          //   });
          //   if (errorMessage) {
          //     setErrorMessage(errorMessage);
          //     return;
          //   }
          // }
          const {
            myUpdatedCards: myCardsAfterTriggeredEffects,
            myUpdatedDice: myDiceAfterTriggeredEffects,
            opponentUpdatedCards: opponentCardsAfterTriggeredEffects,
            opponentUpdatedDice: opponentDiceAfterTriggeredEffects,
            errorMessage,
          } = effectLogic.execute({
            effect,
            playerID: myID,
            summons,
            myCards: myUpdatedCards,
            myDice: myUpdatedDice,
            opponentCards: opponentInGameCards,
            opponentDice: opponentDice,
            currentRound,
            targetCards: selectedTargetCards,

            //TODO: add trigger context
          });
          if (errorMessage) {
            setErrorMessage(errorMessage);
            throw new Error(errorMessage);
          }
          myCardsAfterTriggeredEffects &&
            (myUpdatedCards = myCardsAfterTriggeredEffects);
          myDiceAfterTriggeredEffects &&
            (myUpdatedDice = myDiceAfterTriggeredEffects);
          opponentCardsAfterTriggeredEffects &&
            (opponentUpdatedCards = opponentCardsAfterTriggeredEffects);
          opponentDiceAfterTriggeredEffects &&
            (opponentUpdatedDice = opponentDiceAfterTriggeredEffects);
        });
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }
    channel?.send({
      type: "broadcast",
      event: "updated_cards_and_dice",
      payload: {
        //the card that was activated is displayed on the opponent's board to highlight its activation
        //only used on cards that were activated from hand
        highlightedCard: card,
        myCards: myUpdatedCards,
        myDice: myUpdatedDice,
        opponentCards: opponentUpdatedCards,
        opponentDice: opponentUpdatedDice,
      },
    });
    setHighlightedCard(card);
    setMyCards(myUpdatedCards);
    setMyDice(myUpdatedDice);
    setOpponentInGameCards(opponentUpdatedCards);
    setOpponentDice(opponentUpdatedDice);
    setSelectedTargets([]);
    setMySelectedDice({});
  };

  return (
    <div
      className={`bg-fieldSecondary grid grid-cols-[10%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_10%] 
    gap-2 w-100% text-slate-100 p-2 overflow-x-hidden border-x-4  transition-colors duration-300 ${
      isMyBoard
        ? isMyTurn && currentPhase !== "PREPARATION_PHASE" && "border-green-500"
        : !isMyTurn && currentPhase !== "PREPARATION_PHASE" && "border-red-500"
    }`}
    >
      <div
        className={`${isMyBoard && "order-2"} 
        bg-fieldHand col-span-full h-32 py-2 grid grid-cols-[4fr_1fr_8fr_5fr] `}
      >
        {/* <div className="text-red-700">{errorMessage || ""}</div> */}
        <div
          className={`h-full flex ${isMyBoard ? "items-end" : "items-start"}`}
        >
          <PlayerBannerInGame
            playerProfile={playerProfile}
            isMyProfile={isMyBoard}
          />
        </div>
        {isMyBoard ? (
          <div className="flex justify-center items-center">
            <span className="text-red-500">{errorMessage}</span>
          </div>
        ) : (
          <div></div>
        )}

        <div className="flex flex-row justify-center items-center gap-2 ">
          {playerCards
            ?.filter((card) => card.location === "HAND")
            .map((card) => (
              <CardInGame
                key={card.id}
                card={card}
                handleClick={() => activateCard(card)}
              />
            ))}
        </div>

        {/* //TODO: display dice, move to new component, fix overflow */}
        <div className="flex justify-between overflow-hidden px-4 items-center">
          {isMyBoard && (
            <>
              {
                /* sort so the attack with effect type NORMAL_ATTACK is first, ELEMENTAL_SKILL is second and ELEMENTAL_BURST is last */
                attacks?.length &&
                  attacks
                    ?.toSorted((a, b) => {
                      if (a.effectType === "NORMAL_ATTACK") return 0;
                      if (a.effectType === "ELEMENTAL_SKILL") return 1;
                      if (a.effectType === "ELEMENTAL_BURST") return 2;
                      return 0;
                    })
                    ?.map((attack) => (
                      <CardAttack
                        key={attack.id}
                        playerID={playerID}
                        attack={attack}
                        handleAttack={() => {
                          const res = activateAttackEffect(attack);
                          if (res) {
                            const {
                              myUpdatedCards,
                              myUpdatedDice,
                              opponentUpdatedCards,
                              opponentUpdatedDice,
                              errorMessage,
                              targetCard,
                            } = res;
                            if (errorMessage) {
                              setErrorMessage(errorMessage);
                              return;
                            }
                            if (attack.effect_basic_info_id) {
                              setUsedAttack({
                                attackerCardID: attack.card_id,
                                targetCardID: targetCard?.id || null,
                                attackEffectBaseID: attack.effect_basic_info_id,
                              });
                              setTimeout(() => {
                                setUsedAttack(null);
                              }, 1500);
                            }
                            myUpdatedCards && setMyCards(myUpdatedCards);
                            myUpdatedDice && setMyDice(myUpdatedDice);
                            opponentUpdatedCards &&
                              setOpponentInGameCards(opponentUpdatedCards);
                            opponentUpdatedDice &&
                              setOpponentDice(opponentUpdatedDice);
                            setSelectedTargets([]);
                            channel
                              ?.send({
                                type: "broadcast",
                                //TODO: use this event or delete it
                                event: "updated_cards_and_dice",
                                payload: {
                                  myCards: myUpdatedCards,
                                  myDice: myUpdatedDice,
                                  opponentCards: opponentUpdatedCards,
                                  opponentDice: opponentUpdatedDice,
                                  usedAttack: {
                                    attackerCardID: attack.card_id,
                                    targetCardID: targetCard?.id || null,
                                    attackEffectBaseID:
                                      attack.effect_basic_info_id,
                                  },
                                },
                              })
                              .then(() => {
                                setMySelectedDice({});
                                //passing the turn to the opponent
                                //the attacker continues their turn if the attack was a fast action or if the opponent finished their actions for the phase
                                if (!isOpponentReadyForNextPhase) {
                                  setCurrentPlayerID(opponentID);
                                  broadcastSwitchPlayer({
                                    channel,
                                    playerID: opponentID,
                                  });
                                }
                              });
                          }
                        }}
                      />
                    ))
              }
            </>
          )}
        </div>
      </div>

      <div
        className={`h-full w-full p-1 flex gap-1 ${
          isMyBoard ? "flex-col" : "flex-col-reverse"
        } justify-center items-center`}
      >
        {/* <span className="text-slate-200">deck zone</span> */}
        <div className="relative flex-col items-center">
          {cardsInDeck.length && (
            <CardInGame card={cardsInDeck[0]} overrideIsFaceDown />
          )}
        </div>
        <span className="text-lg font-semibold text-slate-300">
          {cardsInDeck.length}
        </span>
      </div>
      <div className="bg-fieldMain">
        {/* action zone */}
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter(
              (card) =>
                card.location === "ACTION" &&
                card.subtype &&
                !card.subtype.includes("EQUIPMENT")
            )
            .map((card) => (
              <CardInGame key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div
        className={`bg-fieldMain h-40 flex items-center justify-center  ${
          !isMyBoard && "self-end"
        }`}
      >
        {/* character zone */}
        <div className="flex flex-row justify-evenly px-2 w-full max-w-md">
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
                <CardInGame
                  key={card.id}
                  card={card}
                  equippedCards={equippedCards}
                  creationDisplayElements={creationDisplayElements}
                  handleClick={() => {
                    isMyBoard &&
                      handleSwitchCharacter(card, { phase: currentPhase });
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="bg-fieldMain h-full">
        {/* SUMMONS */}
        {playerCards
          ?.filter((card) => card.location === "SUMMON")
          .map((card) => {
            return <CardInGame key={card.id} card={card} />;
          })}
      </div>
      <div className="h-40">
        <DiceDisplay
          channel={channel}
          dice={playerDice}
          isMyBoard={isMyBoard}
          withElementalTuning
          isMain
        ></DiceDisplay>
      </div>
      {isMyBoard && <DiceReroll channel={channel} />}
      {isMyBoard && <CardRedraw channel={channel} />}
      {isMyBoard && <GameOver />}
    </div>
  );
}
