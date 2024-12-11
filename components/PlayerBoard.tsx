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
  amIReadyForNextPhaseState,
  opponentCharacterChangesAfterAttackState,
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
  findCostModifyingEffectsWithCardIDs,
  findEffectsThatTriggerOnWithCardIDs,
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

  const setOpponentCharacterChangesAfterAttack = useSetRecoilState(
    opponentCharacterChangesAfterAttackState
  );
  const amIReadyForNextPhase = useRecoilValue(amIReadyForNextPhaseState);
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
      amIReadyForNextPhase,
    }: {
      phase: PhaseName | null;
      amIReadyForNextPhase: boolean;
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
        if (c.id === activeCharacter?.id) {
          return { ...c, is_active: false };
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
            } else {
              if (c.location === "CHARACTER" && c.is_active) {
                return { ...c, is_active: false };
              }
            }
            return c;
          }) as CardExtended[]
      );
      if (amIReadyForNextPhase) {
        //if the player is ready for the next phase, the turn is passed back to the opponent
        setCurrentPlayerID(opponentID);
        channel &&
          broadcastSwitchPlayer({
            channel,
            playerID: opponentID,
          });
      }
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

      const effectsThatTriggerOnSwitchWithCardIDs =
        findEffectsThatTriggerOnWithCardIDs(
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
      effectsThatTriggerOnSwitchWithCardIDs.forEach(({ effect, cardID }) => {
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
          thisCardID: cardID,
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
    const opponentCharactersBeforeAttack = opponentInGameCards.filter(
      (c) => c.location === "CHARACTER"
    );
    //the target of the attack is the opponent's active character
    const opponentActiveCharacter = opponentCharactersBeforeAttack.find(
      (c) => c.is_active
    );
    if (!opponentActiveCharacter) {
      return { errorMessage: "No target found" };
    }

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
      const costModifyingEffectsWithCardIDs =
        findCostModifyingEffectsWithCardIDs(myCards);
      //execute all cost modifying effects
      costModifyingEffectsWithCardIDs.forEach(({ effect, cardID }) => {
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
          thisCardID: cardID,
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
      modifiedDamage,
    } = activateEffect({
      thisCardID: attackerCard!.id,
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
    const opponentCharactersAfterAttack = opponentUpdatedCards?.filter(
      (c) => c.location === "CHARACTER"
    );
    const opponentCharactersHealthAndStatusChanges =
      opponentCharactersAfterAttack?.reduce<CardStatChange[]>((acc, card) => {
        const cardBeforeAttack = opponentCharactersBeforeAttack.find(
          (c) => c.id === card.id
        );
        if (!cardBeforeAttack) return acc;
        const healthChange = card.health! - cardBeforeAttack.health!;
        const statusesAdded = card.statuses?.filter(
          (status) =>
            !cardBeforeAttack.statuses?.find((s) => s.name === status.name)
        );
        const statusesRemoved = cardBeforeAttack.statuses?.filter(
          (status) => !card.statuses?.find((s) => s.name === status.name)
        );
        if (
          healthChange !== 0 ||
          statusesAdded?.length ||
          statusesRemoved?.length
        ) {
          acc.push({
            cardID: card.id,
            healthChange,
            statusesAdded,
            statusesRemoved,
          });
        }
        return acc;
      }, []);

    return {
      myUpdatedCards,
      myUpdatedDice: myUpdatedDice || myDiceAfterCost,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
      attackerCard,
      targetCard: opponentActiveCharacter,
      modifiedDamage,
      opponentCharacterChanges: opponentCharactersHealthAndStatusChanges,
    };
  };
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
        const costModifyingEffectsWithCardIDs =
          findCostModifyingEffectsWithCardIDs(myCards);
        //execute all cost modifying effects
        costModifyingEffectsWithCardIDs.forEach(({ effect, cardID }) => {
          const effectLogic = findEffectLogic(effect);
          if (!effectLogic?.execute) return;
          let {
            modifiedCost,
            errorMessage,
            myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
          } = effectLogic.execute({
            summons,
            thisCardID: cardID,
            effect,
            playerID: myID,
            myCards: myUpdatedCards,
            myDice,
            opponentCards: opponentUpdatedCards,
            opponentDice: opponentUpdatedDice,
            targetCards: selectedTargetCards,
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
            targetCards: selectedTargetCards,
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

    const myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs =
      findEffectsThatTriggerOnWithCardIDs(
        "CARD_ACTIVATION",
        myCards,
        //cost modifers will be handled separately before the other effects are executed
        { includeCostModifiers: false }
      );

    //TODO: how do I update the effect usage count on this and other cards?

    try {
      if (
        thisCardEffectsThatTriggerOnThisCardActivation.length !== 0 ||
        myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs.length !== 0
      ) {
        //execute all effects that trigger on this card activation

        [
          ...(thisCardEffectsThatTriggerOnThisCardActivation.map(
            (cardEffect) => ({
              effect: cardEffect,
              cardID: card.id,
            })
          ) || []),
          ...(myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs || []),
        ].forEach(({ effect, cardID }, idx) => {
          const effectLogic = findEffectLogic(effect);
          const eventType =
            idx < thisCardEffectsThatTriggerOnThisCardActivation.length
              ? "THIS_CARD_ACTIVATION"
              : "CARD_ACTIVATION";
          if (!effectLogic.execute) return;

          const {
            myUpdatedCards: myCardsAfterTriggeredEffects,
            myUpdatedDice: myDiceAfterTriggeredEffects,
            opponentUpdatedCards: opponentCardsAfterTriggeredEffects,
            opponentUpdatedDice: opponentDiceAfterTriggeredEffects,
            errorMessage,
          } = effectLogic.execute({
            effect,
            thisCardID: cardID,
            playerID: myID,
            summons,
            myCards: myUpdatedCards,
            myDice: myUpdatedDice,
            opponentCards: opponentInGameCards,
            opponentDice: opponentDice,
            currentRound,
            targetCards: selectedTargetCards,
            triggerContext: {
              eventType,
              cost,
              activatedCard: card,
              targetCards: selectedTargetCards,
            },
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
                    ?.toSorted((a: Effect, b: Effect) => {
                      const order = [
                        "NORMAL_ATTACK",
                        "ELEMENTAL_SKILL",
                        "ELEMENTAL_BURST",
                      ];
                      return (
                        order.indexOf(a.effectType!) -
                        order.indexOf(b.effectType!)
                      );
                    })
                    ?.map((attack) => (
                      <CardAttack
                        key={attack.id}
                        playerID={playerID}
                        attack={attack}
                        handleMouseEnter={() => {
                          const res = activateAttackEffect(attack);
                          console.log(res);
                          if (!res) return;
                          const { opponentCharacterChanges } = res;

                          opponentCharacterChanges &&
                            setOpponentCharacterChangesAfterAttack(
                              opponentCharacterChanges
                            );
                        }}
                        handleMouseLeave={() => {
                          setOpponentCharacterChangesAfterAttack(null);
                        }}
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
                            const opponentsActiveCharacterIsDefeated =
                              opponentUpdatedCards?.find(
                                (c) =>
                                  c.location === "CHARACTER" &&
                                  c.is_active &&
                                  c.health === 0
                              );
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
                                if (
                                  !isOpponentReadyForNextPhase ||
                                  //if the opponent's active character was defeated, they switch to another character, even if they have finished their actions in this phase
                                  opponentsActiveCharacterIsDefeated
                                ) {
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
                      handleSwitchCharacter(card, {
                        phase: currentPhase,
                        amIReadyForNextPhase,
                      });
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
