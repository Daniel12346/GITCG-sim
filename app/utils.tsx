import { uuid } from "uuidv4";
import { findEffectLogic } from "./cardEffects";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { DieElementNameT } from "./global";
import { subtractCost } from "./actions";
import { useRef, useEffect } from "react";

type CardBasicInfo = Database["public"]["Tables"]["card_basic_info"]["Row"];
export const cardFromBasicInfo = (
  cardBasicInfo: CardBasicInfo,
  ownerID?: string,
  location?: CardExt["location"]
): CardExt => {
  const cardID = uuid();
  return {
    ...cardBasicInfo,
    element: (cardBasicInfo.element as ElementName) || null,
    //@ts-ignore
    quantity: cardBasicInfo.quantity || null,
    card_type: cardBasicInfo.card_type ?? "",
    counters: [],
    location:
      location ||
      (cardBasicInfo.card_type === "CHARACTER" ? "CHARACTER" : "DECK"),
    id: cardID,
    card_basic_info_id: cardBasicInfo.id,
    energy: cardBasicInfo.card_type === "CHARACTER" ? 0 : null,
    shield: 0,
    health: cardBasicInfo.base_health,
    statuses: [],
    usages: 0,
    //refers to whether the card is currently in play (only for character cards)
    is_active: false,
    owner_id: ownerID || "",
    costJson: cardBasicInfo.cost,
    cost: cardBasicInfo.cost as Dice,
    subtype: cardBasicInfo.card_subtype || "",
    equippedTo: null,
    wasActivatedThisTurn: false,
    isCombatAction: cardBasicInfo.is_combat_action || false,

    //@ts-ignore
    effects: cardBasicInfo.effect_basic_info.map(
      (effectBasicInfo: any): Effect => {
        return {
          ...effectBasicInfo,
          id: uuid(),
          effect_basic_info_id: effectBasicInfo.id,
          card_id: cardID,
          total_usages: 0,
          usages_this_turn: 0,
          costJson: effectBasicInfo.cost,
          cost: effectBasicInfo.cost as Dice,
          description: effectBasicInfo.description || "",
          effectType: effectBasicInfo.effect_type || "",
        };
      }
    ),
  };
};

export const addCardBasicInfoToDeck = async (
  client: SupabaseClient,
  basicInfoID: string,
  deckID: string
) => {
  const currentQuantityData = await client
    .from("deck_card_basic_info")
    .select("quantity")
    .eq("deck_id", deckID)
    .eq("card_basic_info_id", basicInfoID);
  const currentQuantity = currentQuantityData.data?.[0]?.quantity || 0;
  const query = currentQuantity
    ? client
        .from("deck_card_basic_info")
        .update({ quantity: currentQuantity + 1 })
        .eq("deck_id", deckID)
        .eq("card_basic_info_id", basicInfoID)
    : client.from("deck_card_basic_info").insert({
        deck_id: deckID,
        card_basic_info_id: basicInfoID,
        quantity: 1,
      });

  const result = await query;
  return result;
};

export const removeBasicInfoFromDeck = async (
  client: SupabaseClient,
  basicInfoID: string,
  deckID: string
) => {
  const currentQuantityData = await client
    .from("deck_card_basic_info")
    .select("quantity")
    .eq("deck_id", deckID)
    .eq("card_basic_info_id", basicInfoID);
  const currentQuantity = currentQuantityData.data?.[0]?.quantity || 0;
  const query = async (client: SupabaseClient) =>
    currentQuantity > 1
      ? client
          .from("deck_card_basic_info")
          .update({ quantity: currentQuantity - 1 })
          .eq("deck_id", deckID)
          .eq("card_basic_info_id", basicInfoID)
      : client
          .from("deck_card_basic_info")
          .delete()
          .eq("deck_id", deckID)
          .eq("card_basic_info_id", basicInfoID);
  const result = await query(client);
  result.error && console.log(result.error);
  return result;
};

export const findEquippedCards = (
  target: CardExt,
  playerCards: CardExt[],
  //TODO: use string enum
  type?: CardExt["subtype"]
) => {
  return playerCards.filter(
    (card) =>
      card.equippedTo === target.id &&
      (card.location !== "DISCARDED" ||
        (card.subtype === "EVENT_FOOD" && card.wasActivatedThisTurn)) &&
      (type ? card.subtype === type : true)
  );
};
type EffectAndCardID = {
  effect: Effect;
  cardID: string;
};

//returns all cost modifying effects of the cards along with IDs of the cards they belong to
export const findCostModifyingEffectsWithCardIDs = (cards: CardExt[]) => {
  return cards.reduce((acc, card) => {
    return ["ACTION", "EQUIPPED"].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects
            .filter((effect) => effect.effectType === "COST_MODIFIER")
            ?.map((effect) => ({ effect, cardID: card.id }))
        )
      : acc;
  }, [] as EffectAndCardID[]);
};

export const findCostModifyingEffectWithCardIDsOfCardsEquippedTo = (
  target: CardExt,
  playerCards: CardExt[]
) => {
  const equippedCards = findEquippedCards(target, playerCards);
  return findCostModifyingEffectsWithCardIDs(equippedCards);
};

export const subtractCostAfterModifiers = ({
  baseCost,
  executeArgs,
  selectedDice,
}: {
  baseCost: Cost;
  executeArgs: Omit<ExecuteEffectParams, "effect" | "thisCardID">;
  selectedDice: Dice;
}) => {
  let modifiedCost = baseCost;
  let myUpdatedDice = executeArgs.myDice;
  let myUpdatedCards = executeArgs.myCards;
  const triggerContext = executeArgs.triggerContext;

  if (!triggerContext) {
    return { errorMessage: "No trigger context" };
  }
  const costModifyingEffectsWithCardIDs =
    findCostModifyingEffectsWithCardIDs(myUpdatedCards);
  //execute all cost modifying effects
  costModifyingEffectsWithCardIDs.forEach(({ effect, cardID }) => {
    const effectLogic = findEffectLogic(effect);
    if (!effectLogic?.execute) return;
    let {
      modifiedCost: modifiedCostAfterCostModyfingEffect,
      errorMessage,
      myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
    } = effectLogic.execute({
      ...executeArgs,
      effect,
      thisCardID: cardID,
      triggerContext: {
        ...triggerContext,
        cost: modifiedCost,
      },
    });

    if (errorMessage) {
      return { errorMessage };
    }
    if (myUpdatedCardsAfterCostModifyingEffect) {
      myUpdatedCards = myUpdatedCardsAfterCostModifyingEffect;
    }
    if (modifiedCostAfterCostModyfingEffect) {
      modifiedCost = modifiedCostAfterCostModyfingEffect;
    }
  });
  try {
    //checking if there are enough dice among the selected dice
    if (calculateTotalDice(selectedDice) !== calculateTotalDice(modifiedCost)) {
      return { errorMessage: "Incorrect number of dice" };
    }
    //subtracting the cost from the selected dice to check if the dice are correct
    subtractCost(selectedDice, modifiedCost);
  } catch (e) {
    return { errorMessage: "Incorrect dice" };
  }
  //if there are enough dice, subtract the selected dice from the total dice
  try {
    myUpdatedDice = subtractCost(myUpdatedDice, selectedDice);
  } catch (e) {
    return { errorMessage: "Not enough total dice" };
  }
  return { modifiedCost, myUpdatedDice, myUpdatedCards };
};
export const calculateCostAfterModifiers = ({
  baseCost,
  executeArgs,
}: {
  baseCost: Cost;
  executeArgs: Omit<ExecuteEffectParams, "effect" | "thisCardID">;
}) => {
  let modifiedCost = baseCost;
  const triggerContext = executeArgs.triggerContext;

  if (!triggerContext) {
    return { errorMessage: "No trigger context" };
  }
  const costModifyingEffectsWithCardIDs = findCostModifyingEffectsWithCardIDs(
    executeArgs.myCards
  );
  //execute all cost modifying effects
  costModifyingEffectsWithCardIDs.forEach(({ effect, cardID }) => {
    const effectLogic = findEffectLogic(effect);
    if (!effectLogic?.execute) return;
    let { modifiedCost: modifiedCostAfterCostModyfingEffect } =
      effectLogic.execute({
        ...executeArgs,
        effect,
        thisCardID: cardID,
        triggerContext: {
          ...triggerContext,
          cost: modifiedCost,
        },
      });

    if (modifiedCostAfterCostModyfingEffect) {
      modifiedCost = modifiedCostAfterCostModyfingEffect;
    }
  });

  return { modifiedCost };
};

export const findDamageModifyingEffectsWithCardIDs = (
  cards: CardExt[],
  trigger?: EventType
) => {
  return cards.reduce((acc, card) => {
    return ["ACTION", "EQUIPPED"].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects
            .filter((effect) => {
              const effectLogic = findEffectLogic(effect);
              return (
                effect.effectType === "DAMAGE_MODIFIER" &&
                (trigger ? effectLogic.triggerOn?.includes(trigger) : true)
              );
            })
            .map((effect) => ({ effect, cardID: card.id }))
        )
      : acc;
  }, [] as EffectAndCardID[]);
};

export const findEffectsThatTriggerOnWithCardIDs = (
  trigger: EventType,
  cards: CardExt[],
  {
    includeCostModifiers = false,
    //include effects with "EITHER_PLAYER_" in their trigger event name
    includeEffectsTriggeredOnEitherPlayerAction = true,
    includeDamageModifiers = false,
  }: {
    includeCostModifiers?: boolean;
    includeEffectsTriggeredOnEitherPlayerAction?: boolean;
    includeDamageModifiers?: boolean;
  } = {}
) => {
  return cards.reduce((acc, card) => {
    //only looking at cards in action, equipped or summon locations or null for creation cards
    return ["ACTION", "EQUIPPED", "SUMMON", null].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects
            .filter((effect) => {
              const effectLogic = findEffectLogic(effect);
              const includesTrigger =
                effectLogic.triggerOn?.includes(trigger) ||
                (includeEffectsTriggeredOnEitherPlayerAction &&
                  effectLogic.triggerOn?.includes(
                    //example:
                    //"OPPONENT_ATTACK" -> "EITHER_PLAYER_ATTACK"
                    //"ATTACK" -> "EITHER_PLAYER_ATTACK"
                    ("EITHER_PLAYER_" +
                      trigger.replace("OPPONENT_", "")) as EventType
                  ));
              if (includesTrigger) {
                if (effect.effectType === "COST_MODIFIER") {
                  return includeCostModifiers;
                }
                if (effect.effectType === "DAMAGE_MODIFIER") {
                  return includeDamageModifiers;
                }
                return true;
              } else {
                return false;
              }
            })
            .map((effect) => ({ effect, cardID: card.id }))
        )
      : acc;
  }, [] as EffectAndCardID[]);
};

export const calculateDamageAfterModifiers = ({
  baseDamage,
  myCards,
  opponentCards,
  myDice,
  opponentDice,
  thisCard,
  targetCards,
  currentRound,
}: {
  baseDamage: number;
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  opponentDice: Dice;
  thisCard: CardExt;
  targetCards: CardExt[];
  currentRound: number;
}) => {
  let damage = baseDamage;
  let myUpdatedCards = myCards;
  const damageModifyingEffects = findDamageModifyingEffectsWithCardIDs(myCards);
  damageModifyingEffects.forEach(({ effect, cardID }) => {
    const effectLogic = findEffectLogic(effect);
    if (
      effectLogic.execute &&
      ((effectLogic?.checkIfCanBeExecuted &&
        effectLogic.checkIfCanBeExecuted({
          myCards,
          opponentCards,
          effect,
          opponentDice,
          currentRound,
          thisCardID: cardID,
          myDice,
        })) ||
        !effectLogic.checkIfCanBeExecuted)
    ) {
      const { modifiedDamage, myUpdatedCards: myUpdatedCardsAfterEffect } =
        effectLogic.execute({
          myCards: myUpdatedCards,
          opponentCards,
          myDice,
          opponentDice,
          effect,
          thisCardID: cardID,
          triggerContext: {
            eventType: "ATTACK",
            damage,
            attack: {
              attackerCard: thisCard,
              attackBaseEffectID: effect.effect_basic_info_id,
            },
            targetCards,
          },
          currentRound,
        });
      if (modifiedDamage) {
        damage = modifiedDamage;
      }
      if (myUpdatedCardsAfterEffect) {
        myUpdatedCards = myUpdatedCardsAfterEffect;
      }
    }
  });
  return { damage, myUpdatedCards };
};

export const createRandomElementalDice = (amount: number) => {
  const elements: DieElementNameT[] = [
    "ANEMO",
    "DENDRO",
    "PYRO",
    "HYDRO",
    "ELECTRO",
    "CRYO",
    "GEO",
  ];
  const dice: Dice = {};
  for (let i = 0; i < amount; i++) {
    const element = elements[Math.floor(Math.random() * elements.length)];
    dice[element] = (dice[element] || 0) + 1;
  }
};

export const calculateTotalDice = (dice: Dice) => {
  return Object.values(dice).reduce((acc, curr) => acc + curr, 0);
};

type CalculateAttackElementalReaction = ({
  damage,
  damageElement,
  attackerCardId,
  targetCardId,
  attackBaseEffectID,
  currentRound,
  myCards,
  opponentCards,
  myDice,
  opponentDice,
}: {
  damage: number;
  attackerCardId: string;
  targetCardId: string;
  attackBaseEffectID: string;
  myCards: CardExt[];
  opponentCards: CardExt[];
  damageElement?: DamageElement;
  currentRound: number;
  myDice: Dice;
  opponentDice: Dice;
}) => {
  errorMessage?: string;
  updatedDamage?: number;
  myCardsAfterReaction?: CardExt[];
  opponentCardsAfterReaction?: CardExt[];
  reactions?: ElementalReaction[];
};

const clearCardStatuses = (card: CardExt, statuses: Status[]) => {
  return {
    ...card,
    statuses: card.statuses?.filter((s) => !statuses.includes(s.name)),
  } as CardExt;
};

const addStatusToCard = (
  card: CardExt,
  status: Status,
  duration?: number,
  amount?: number
) => {
  const alreadyHasStatus = card.statuses?.find(
    (s: CardStatus) => s.name === status
  );
  const statuses = alreadyHasStatus
    ? card.statuses?.map((s: CardStatus) => {
        if (s.name === status) {
          return {
            ...s,
            turnsLeft:
              //status has unlimited duration
              s.turnsLeft === undefined || duration === undefined
                ? undefined
                : s.turnsLeft + duration,
            amount: s?.amount && amount ? s.amount + amount : amount,
          };
        }
        return s;
      })
    : [...(card.statuses || []), { name: status, turnsLeft: duration, amount }];

  return {
    ...card,
    statuses,
  } as CardExt;
};

//TODO?: move to a new file
export const calculateAttackElementalReaction: CalculateAttackElementalReaction =
  ({
    damage,
    damageElement,
    // effectDuration
    attackerCardId,
    targetCardId,
    myCards,
    opponentCards,
    attackBaseEffectID,
    currentRound,
    myDice,
    opponentDice,
  }) => {
    if (!myCards || !opponentCards) {
      return {
        errorMessage: "My cards or opponent cards are missing",
      };
    }

    const attackerCard = myCards.find((card) => card.id === attackerCardId);
    const targetCard = opponentCards.find((card) => card.id === targetCardId);
    if (!attackerCard || !targetCard) {
      return {
        errorMessage: "Attacker or target card is missing",
      };
    }

    const infusionStatus = attackerCard.statuses?.find((status: CardStatus) =>
      status.name.includes("INFUSION")
    );
    const infusionElement = infusionStatus?.name.split("_")[0] as ElementName;
    //infusionElement overrides PHYSICAL damage
    if (infusionElement && damageElement === "PHYSICAL") {
      damageElement = infusionElement;
    }

    const targetStatuses = targetCard.statuses || [];

    const reactingElements = [
      ...targetStatuses.map((status) => status.name),
      damageElement,
    ];
    let updatedDamage = damage;
    let reactions: ElementalReaction[] = [];
    let opponentUpdatedCards = opponentCards;
    let myUpdatedCards = myCards;
    //refers to the element that was swirled, possibly other uses, TODO!: rename
    let resultingElement: ElementName | null = null;
    //SHATTERED
    if (damageElement === "PHYSICAL") {
      if (
        targetStatuses.find((status: CardStatus) => status.name === "FROZEN")
      ) {
        updatedDamage += 2;
        reactions.push("SHATTERED");
        opponentUpdatedCards = opponentCards.map((card) => {
          if (card.id === targetCardId) {
            return clearCardStatuses(card, ["FROZEN"]);
          }
          return card;
        });
      }
    }
    if (
      damageElement === "PYRO" &&
      targetStatuses.find((status) => status.name === "FROZEN")
    ) {
      updatedDamage += 2;
      opponentCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["FROZEN"]);
        }
        return card;
      });
    }
    //VAPORIZE
    if (
      reactingElements.includes("PYRO") &&
      reactingElements.includes("HYDRO")
    ) {
      updatedDamage += 2;
      reactions.push("VAPORIZE");
      opponentUpdatedCards = opponentUpdatedCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["PYRO", "HYDRO"]);
        }
        return card;
      });
    }
    //ELECTROCHARGED
    else if (
      reactingElements.includes("HYDRO") &&
      reactingElements.includes("ELECTRO")
    ) {
      updatedDamage += 1;
      reactions.push("ELECTROCHARGED");
      opponentUpdatedCards = opponentUpdatedCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["HYDRO", "ELECTRO"]);
          //doing 1 damage to all characters except the target
        } else if (card.location === "CHARACTER") {
          const updatedHealth =
            card.health !== null && Math.max(0, card.health - 1);
          const defeatedInTurn =
            updatedHealth === 0 ? currentRound : card.defeatedInTurn;
          return { ...card, defeatedInTurn, updatedHealth };
        } else {
          return card;
        }
      });
    }
    //FROZEN
    else if (
      reactingElements.includes("CRYO") &&
      reactingElements.includes("HYDRO")
    ) {
      updatedDamage += 1;
      reactions.push("FROZEN");
      opponentUpdatedCards = opponentUpdatedCards.map((card) => {
        if (card.id === targetCardId) {
          const cleared = clearCardStatuses(card, ["CRYO", "HYDRO"]);
          const updated = addStatusToCard(cleared, "FROZEN", 1);
          return updated;
        }
        return card;
      });
    }
    //SWIRL
    else if (
      targetStatuses.find((status: CardStatus) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      ) &&
      damageElement === "ANEMO"
    ) {
      const elementToSwirl = targetStatuses.find((status) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      );
      resultingElement = elementToSwirl?.name;
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, [elementToSwirl?.name]);
        }
        return card;
      });
      updatedDamage += 1;
      reactions?.push("SWIRL");
      const swirlTargets = opponentCards.filter(
        (card) => card.location === "CHARACTER" && card.id !== targetCardId
      );
      swirlTargets.forEach((card) => {
        const {
          reactions: extraReactions,
          opponentCardsAfterReaction,
          myCardsAfterReaction,
        } = calculateAttackElementalReaction({
          damage: 1,
          damageElement: elementToSwirl?.name,
          attackerCardId,
          targetCardId: card.id,
          myCards: myUpdatedCards,
          opponentCards: opponentUpdatedCards,
          attackBaseEffectID: "",
          currentRound,
          myDice,
          opponentDice,
        });
        extraReactions &&
          reactions.forEach((reaction) => reactions.push(reaction));
        if (opponentCardsAfterReaction) {
          opponentUpdatedCards = opponentCardsAfterReaction;
        }
        if (myCardsAfterReaction) {
          myUpdatedCards = myCardsAfterReaction;
        }
      });
    }
    //CRYSTALLIZE
    else if (
      targetStatuses.find((status: CardStatus) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      ) &&
      damageElement === "GEO"
    ) {
      const elementToCrystallize = targetStatuses.find((status) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      );
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, [elementToCrystallize?.name]);
        }
        return card;
      });
      myUpdatedCards = myCards.map((card) => {
        if (card.is_active) {
          const shield =
            card.shield !== undefined && card.shield < 2
              ? card.shield + 1
              : card.shield;
          return {
            ...card,
            shield,
          };
        }
        return card;
      });
      updatedDamage += 1;
      reactions?.push("CRYSTALLIZE");
    }
    //SUPERCONDUCT
    else if (
      reactingElements.includes("CRYO") &&
      reactingElements.includes("ELECTRO")
    ) {
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["CRYO", "ELECTRO"]);
        }
        return card;
      });
      updatedDamage += 1;
      //superconduct does 1 piercing damage to all characters except the target
      const piercingTargets = opponentCards.filter(
        (card) => card.location === "CHARACTER" && card.id !== targetCardId
      );
      piercingTargets.forEach((card) => {
        const {
          reactions: extraReactions,
          opponentCardsAfterReaction,
          myCardsAfterReaction,
        } = calculateAttackElementalReaction({
          damage: 1,
          damageElement: "PIERCING",
          attackerCardId,
          targetCardId: card.id,
          myCards: myUpdatedCards,
          opponentCards: opponentUpdatedCards,
          attackBaseEffectID: "",
          currentRound,
          myDice,
          opponentDice,
        });
        extraReactions &&
          extraReactions.forEach((reaction) => reactions.push(reaction));
        if (opponentCardsAfterReaction) {
          opponentUpdatedCards = opponentCardsAfterReaction;
        }
        if (myCardsAfterReaction) {
          myUpdatedCards = myCardsAfterReaction;
        }
      });
    }
    //MELT
    else if (
      reactingElements.includes("PYRO") &&
      reactingElements.includes("CRYO")
    ) {
      updatedDamage += 2;
      reactions.push("MELT");
      opponentUpdatedCards = opponentUpdatedCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["PYRO", "CRYO"]);
        }
        return card;
      });
    } else if (
      reactingElements.includes("PYRO") &&
      reactingElements.includes("ELECTRO")
    ) {
      updatedDamage += 2;
      reactions.push("OVERLOADED");
      let opponentCharacters = opponentUpdatedCards.filter(
        (card) => card.location === "CHARACTER"
      );
      let previousActiveCharacterIndex = opponentCharacters.findIndex(
        (card) => card.is_active
      );
      if (previousActiveCharacterIndex === -1) {
        previousActiveCharacterIndex = 0;
      }
      const nextActiveCharacterIndex =
        previousActiveCharacterIndex === opponentCharacters.length - 1
          ? 0
          : previousActiveCharacterIndex + 1;
      const previousActiveCharacter =
        opponentCharacters[previousActiveCharacterIndex];
      const nextActiveCharacter = opponentCharacters[nextActiveCharacterIndex];
      opponentUpdatedCards = opponentUpdatedCards
        ?.map((card) => {
          if (card.location === "CHARACTER") {
            if (card.id === previousActiveCharacter.id) {
              return {
                ...card,
                is_active: false,
              };
            } else if (card.id === nextActiveCharacter.id) {
              return {
                ...card,
                is_active: true,
              };
            }
          }
          return card;
        })
        .map((card) => {
          if (card.id === targetCardId) {
            return clearCardStatuses(card, ["PYRO", "ELECTRO"]);
          }
          return card;
        });
    } else {
      if (
        damageElement &&
        //PIERCING, PHYSICAL, GEO and ANEMO don't create elemental statuses on their own
        !(["ANEMO", "GEO", "PIERCING", "PHYSICAL"] as DamageElement[]).includes(
          damageElement
        )
      ) {
        //adding the attacking element to the target's statuses if no other reaction happened
        opponentUpdatedCards = opponentCards.map((card) => {
          if (card.id === targetCardId) {
            return addStatusToCard(card, damageElement as ElementName);
          }
          return card;
        });
      }
    }
    opponentUpdatedCards = opponentUpdatedCards.map((card) => {
      if (card.id === targetCardId) {
        updatedDamage =
          damageElement === "PIERCING"
            ? updatedDamage
            : updatedDamage - (card.shield || 0);
        const updatedHealth =
          card.health && Math.max(0, card.health - updatedDamage);

        return {
          ...card,
          health: updatedHealth,
          defeatedInTurn:
            updatedHealth === 0 ? currentRound : card.defeatedInTurn,
        };
      }
      return card;
    });

    myUpdatedCards = myCards.map((card) => {
      if (card.id === attackerCardId) {
        const updatedCardEffects = card.effects.map((effect) => {
          if (
            attackBaseEffectID &&
            effect.effect_basic_info_id === attackBaseEffectID
          ) {
            const usages_this_turn = effect.usages_this_turn || 0;
            const total_usages = effect.total_usages || 0;
            return {
              ...effect,
              usages_this_turn: usages_this_turn + 1,
              total_usages: total_usages + 1,
            };
          }
          return effect;
        });
        const currentEnergy = card.energy;
        const updatedEnergy =
          currentEnergy !== null
            ? //summons etc. don't have max_energy
              card.max_energy && currentEnergy < card.max_energy!
              ? currentEnergy + 1
              : currentEnergy
            : null;
        //decrease infusion duration by 1, if duration is 0, remove the status
        const updatedStatuses = card.statuses
          ?.map((status) => {
            if (status.name.includes("INFUSION")) {
              const turnsLeft = status.turnsLeft - 1;
              return turnsLeft > 0 ? { ...status, turnsLeft } : null;
            }
            return status;
          })
          .filter((status) => status !== null) as CardStatus[];
        return {
          ...card,
          effects: updatedCardEffects,
          energy: updatedEnergy,
          statuses: updatedStatuses,
        };
      }
      return card;
    });

    const myEffectsThatTriggerOnReaction = findEffectsThatTriggerOnWithCardIDs(
      "REACTION",
      myUpdatedCards
    );
    const opponentEffectsThatTriggerOnReaction =
      findEffectsThatTriggerOnWithCardIDs(
        "OPPONENT_REACTION",
        opponentUpdatedCards
      );
    if (myEffectsThatTriggerOnReaction.length > 0) {
      myEffectsThatTriggerOnReaction.forEach(({ effect, cardID }) => {
        const effectLogic = findEffectLogic(effect);
        const {
          myUpdatedCards: myUpdatedCardsAfterEffects,
          opponentUpdatedCards: opponentUpdatedCardsAfterEffects,
        } = effectLogic.execute({
          effect,
          myCards: myUpdatedCards,
          opponentCards: opponentUpdatedCards,
          myDice,
          thisCardID: cardID,
          opponentDice,
          triggerContext: {
            eventType: "REACTION",
            reaction: {
              names: reactions,
              resultingElement: resultingElement || undefined,
              cause: "ATTACK",
            },
            attack: {
              attackerCard: attackerCard,
              attackBaseEffectID,
              damageElement,
              damageDealt: updatedDamage,
            },
          },
          currentRound,
        });
        if (myUpdatedCardsAfterEffects) {
          myUpdatedCards = myUpdatedCardsAfterEffects;
        }
        if (opponentUpdatedCardsAfterEffects) {
          opponentUpdatedCards = opponentUpdatedCardsAfterEffects;
        }
        // }
      });
    }
    if (opponentEffectsThatTriggerOnReaction.length > 0) {
      opponentEffectsThatTriggerOnReaction.forEach(({ effect, cardID }) => {
        const effectLogic = findEffectLogic(effect);
        //perspectives of the player and their opponent are switched
        const {
          myUpdatedCards: opponentUpdatedCardsAfterEffects,
          opponentUpdatedCards: myUpdatedCardsAfterEffects,
        } = effectLogic.execute({
          effect,
          myCards: opponentUpdatedCards,
          opponentCards: myUpdatedCards,
          myDice,
          thisCardID: cardID,
          opponentDice,
          triggerContext: {
            eventType: "REACTION",
            reaction: {
              names: reactions,
              resultingElement: resultingElement || undefined,
              cause: "ATTACK",
            },
            attack: {
              attackerCard: attackerCard,
              attackBaseEffectID,
              damageElement,
              damageDealt: updatedDamage,
            },
          },
          currentRound,
        });
        if (myUpdatedCardsAfterEffects) {
          myUpdatedCards = myUpdatedCardsAfterEffects;
        }
        if (opponentUpdatedCardsAfterEffects) {
          opponentUpdatedCards = opponentUpdatedCardsAfterEffects;
        }
      });
    }
    return {
      opponentCardsAfterReaction: opponentUpdatedCards,
      myCardsAfterReaction: myUpdatedCards,
      reactions,
      updatedDamage,
    };
  };

export const increaseEffectUsages = (card: CardExt, baseEffectID: string) => {
  return card.effects.map((effect) => {
    if (effect.effect_basic_info_id === baseEffectID) {
      const usages_this_turn = effect.usages_this_turn || 0;
      const total_usages = effect.total_usages || 0;
      return {
        ...effect,
        usages_this_turn: usages_this_turn + 1,
        total_usages: total_usages + 1,
      };
    }
    return effect;
  });
};

export const createSummon = ({
  summonBasicInfoID,
  isCreation = false,
  myCards,
  summons,
  maxUsages,
}: {
  summonBasicInfoID: string;
  //creations have effects and usages like summons but are not visible on the board as cards
  isCreation?: boolean;
  summons: CardExt[];
  myCards: CardExt[];
  summonerCard?: CardExt;
  myDice?: Dice;
  maxUsages: number;
  opponentCards?: CardExt[];
  opponentDice?: Dice;
}) => {
  const summonOriginal = summons.find(
    (summon: CardExt) => summon.card_basic_info_id === summonBasicInfoID
  );
  if (!summonOriginal) {
    return { errorMessage: "Summon not found" };
  }
  // const summoner =
  //   summonerCard || myCards.find((card) => card.id === summonerCard);
  // if (!summoner) {
  //   return { errorMessage: "Summoner not found" };
  // }
  const summonId = uuid();
  const summon: CardExt = {
    ...summonOriginal,
    id: summonId,
    location: isCreation ? null : "SUMMON",
    max_usages: maxUsages,
    usages: 0,
    effects: summonOriginal.effects.map((effect) => ({
      ...effect,
      id: uuid(),
      card_id: summonId,
      total_usages: 0,
      usages_this_turn: 0,
    })),
  };
  //TODO: can a summon be summoned to the opponent's side?
  const myUpdatedCards = [...myCards, summon];
  //TODO: effects that trigger on summon
  return { myUpdatedCards };
};

type ExecuteEffectsSequentiallyParams = {
  effectsAndCardIDs: EffectAndCardID[];
  executeArgs: Omit<ExecuteEffectParams, "effect" | "thisCardID">;
};
export const executeEffectsSequentially = ({
  effectsAndCardIDs,
  executeArgs,
}: ExecuteEffectsSequentiallyParams) => {
  let myUpdatedCards = executeArgs.myCards;
  let myUpdatedDice = executeArgs.myDice;
  let opponentUpdatedCards = executeArgs.opponentCards;
  let opponentUpdatedDice = executeArgs.opponentDice;
  let errorMessage: string | null = null;

  effectsAndCardIDs.forEach(({ effect, cardID }) => {
    if (errorMessage) return;
    const effectLogic = findEffectLogic(effect);
    if (!effectLogic.execute) return;
    const {
      myUpdatedCards: myUpdatedCardsAfterEffects,
      myUpdatedDice: myUpdatedDiceAfterEffects,
      opponentUpdatedCards: opponentUpdatedCardsAfterEffects,
      opponentUpdatedDice: opponentUpdatedDiceAfterEffects,
      errorMessage: errorMessageAfterEffects,
    } = effectLogic.execute({
      ...executeArgs,
      myCards: myUpdatedCards,
      myDice: myUpdatedDice,
      opponentCards: opponentUpdatedCards,
      opponentDice: opponentUpdatedDice,
      effect,
      thisCardID: cardID,
    });
    if (errorMessageAfterEffects) {
      errorMessage = errorMessageAfterEffects;
    }
    if (myUpdatedCardsAfterEffects) {
      myUpdatedCards = myUpdatedCardsAfterEffects;
    }
    if (myUpdatedDiceAfterEffects) {
      myUpdatedDice = myUpdatedDiceAfterEffects;
    }
    if (opponentUpdatedCardsAfterEffects) {
      opponentUpdatedCards = opponentUpdatedCardsAfterEffects;
    }
    if (opponentUpdatedDiceAfterEffects) {
      opponentUpdatedDice = opponentUpdatedDiceAfterEffects;
    }
  });
  return {
    errorMessage,
    myUpdatedCards,
    myUpdatedDice,
    opponentUpdatedCards,
    opponentUpdatedDice,
  };
};

type ExecutePhaseEffectsParams = {
  // amIPlayer1: boolean;
  phaseName: PhaseName;
  executeArgs: Omit<ExecuteEffectParams, "effect" | "thisCardID">;
  areMyEffectsFirst?: boolean;
};
const executePhaseEffectsForOnePlayer = ({
  phaseName,
  executeArgs,
}: ExecutePhaseEffectsParams) => {
  let myUpdatedCards = executeArgs.myCards;
  let myUpdatedDice = executeArgs.myDice;
  let opponentUpdatedCards = executeArgs.opponentCards;
  let opponentUpdatedDice = executeArgs.opponentDice;
  const myEffectsThatTriggeOnPhase = findEffectsThatTriggerOnWithCardIDs(
    phaseName,
    myUpdatedCards
  );
  const {
    myUpdatedCards: myCardsAfterTriggeredEffects,
    myUpdatedDice: myDiceAfterTriggeredEffects,
    opponentUpdatedCards: opponentInGameCardsAfterTriggeredEffects,
    opponentUpdatedDice: opponentDiceAfterTriggeredEffects,
    errorMessage,
  } = executeEffectsSequentially({
    effectsAndCardIDs: myEffectsThatTriggeOnPhase,
    executeArgs: {
      ...executeArgs,
      myCards: myUpdatedCards,
      myDice: myUpdatedDice,
      opponentCards: opponentUpdatedCards,
      opponentDice: opponentUpdatedDice,
      triggerContext: {
        eventType: phaseName,
      },
    },
  });
  if (errorMessage) {
    return { errorMessage };
  }
  myCardsAfterTriggeredEffects &&
    (myUpdatedCards = myCardsAfterTriggeredEffects);
  myDiceAfterTriggeredEffects && (myUpdatedDice = myDiceAfterTriggeredEffects);
  opponentInGameCardsAfterTriggeredEffects &&
    (opponentUpdatedCards = opponentInGameCardsAfterTriggeredEffects);
  opponentDiceAfterTriggeredEffects &&
    (opponentUpdatedDice = opponentDiceAfterTriggeredEffects);

  return {
    myUpdatedCards,
    myUpdatedDice,
    opponentUpdatedCards,
    opponentUpdatedDice,
  };
};

export const executePhaseEffectsForBothPlayers = ({
  phaseName,
  executeArgs,
}: ExecutePhaseEffectsParams) => {
  //player 1 is always the one executing this entire function

  //executing phase effects for player 1 (myUpdatedCards, myUpdatedDice refer to player 1)
  const {
    myUpdatedCards: thisSideUpdatedCardsFromFirstSide,
    myUpdatedDice: thisSideUpdatedDiceFromFirstSide,
    opponentUpdatedCards: otherSideUpdatedCardsFromFirstSide,
    opponentUpdatedDice: otherSideUpdatedDiceFromFirstSide,
    errorMessage: errorMessageFirstSide,
  } = executePhaseEffectsForOnePlayer({
    phaseName,
    executeArgs,
  });
  if (errorMessageFirstSide) {
    return { errorMessage: errorMessageFirstSide };
  }
  //executing phase effects for the other side, reversing the arguments because the effects are executed from the perspective of that player
  const secondSideExecuteArgs = {
    ...executeArgs,
    myCards: otherSideUpdatedCardsFromFirstSide,
    myDice: otherSideUpdatedDiceFromFirstSide,
    opponentCards: thisSideUpdatedCardsFromFirstSide,
    opponentDice: thisSideUpdatedDiceFromFirstSide,
  };
  const {
    myUpdatedCards: thisSideUpdatedCardsFromSecondSide,
    myUpdatedDice: thisSideUpdatedDiceFromSecondSide,
    opponentUpdatedCards: otherSideUpdatedCardsFromSecondSide,
    opponentUpdatedDice: otherSideUpdatedDiceFromSecondSide,
    errorMessage: errorMessageOtherSide,
  } = executePhaseEffectsForOnePlayer({
    phaseName,
    executeArgs: secondSideExecuteArgs,
  });
  if (errorMessageOtherSide) {
    return { errorMessage: errorMessageOtherSide };
  }
  return {
    myUpdatedCards: otherSideUpdatedCardsFromSecondSide,
    myUpdatedDice: otherSideUpdatedDiceFromSecondSide,
    opponentUpdatedCards: thisSideUpdatedCardsFromSecondSide,
    opponentUpdatedDice: thisSideUpdatedDiceFromSecondSide,
  };
};

export const broadcastSwitchPlayer = ({
  channel,
  playerID,
  delay = 400,
}: {
  channel: RealtimeChannel;
  playerID: string;
  delay?: number;
}) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      channel
        ?.send({
          type: "broadcast",
          event: "switch_player",
          payload: { playerID },
        })
        .then(resolve)
        .catch(reject);
    }, delay);
  });
};

export const broadcastUpdatedCardsAndDice = ({
  channel,
  myCards,
  myDice,
  opponentCards,
  opponentDice,
}: {
  channel: RealtimeChannel;
  myCards?: CardExt[];
  myDice?: Dice;
  opponentCards?: CardExt[];
  opponentDice?: Dice;
}) => {
  return channel?.send({
    type: "broadcast",
    event: "updated_cards_and_dice",
    payload: { myCards, myDice, opponentCards, opponentDice },
  });
};

export const shuffleDeck = (deck: CardExt[]) => {
  const characterCards = deck.filter((card) => card.card_type === "CHARACTER");
  const otherCards = deck.filter((card) => card.card_type !== "CHARACTER");
  const shuffledCards = otherCards.toSorted(() => Math.random() - 0.5);
  return [...characterCards, ...shuffledCards];
};

export const calculateDeckCardCount = (
  deck: CardBasicInfoWithQuantityAndEffects[]
) => {
  return deck.reduce((acc, card) => acc + card.quantity, 0);
};

export const usePrevious = <T,>(value: T) => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const updateGameWinnerInDatabase = async (
  client: SupabaseClient<Database>,
  gameID: string,
  gameWinnerID: string,
  turnCount: number
) => {
  const { data, error } = await client
    .from("game")
    .update({ winner_id: gameWinnerID, turn_count: turnCount })
    .eq("id", gameID)
    .select();

  if (error) return { errorMessage: error.message };
  return { data };
};

export const updateMyCurrentDeckInDatabase = async (
  client: SupabaseClient<Database>,
  myID: string,
  deckID: string
) => {
  await client
    .from("profile")
    .update({ current_deck_id: deckID })
    .eq("id", myID);
};

export const copyDeck = async ({
  client,
  deckCards,
  deckName,
  myID,
}: {
  client: SupabaseClient<Database>;
  deckCards: CardBasicInfoWithQuantityAndEffects[];
  deckName: string;
  myID: string;
}) => {
  const { data: deck, error: deckError } = await client
    .from("deck")
    .insert({ name: deckName, player_id: myID })
    .select("*")
    .single();
  if (deckError) {
    console.log("Error creating deck", deckError);
    throw new Error("Error creating deck");
  }
  const cardIdsWithQuantities = deckCards.map((cardBasicInfo) => ({
    card_basic_info_id: cardBasicInfo.id,
    quantity: cardBasicInfo.quantity,
    deck_id: deck.id,
  }));
  const { error: deckCardsInsertError } = await client
    .from("deck_card_basic_info")
    .insert(cardIdsWithQuantities)
    .eq("deck_id", deck.id);
  if (deckCardsInsertError) {
    throw new Error("Error copying deck cards");
  }
};

export const deleteDeck = async ({
  client,
  deckID,
}: {
  client: SupabaseClient<Database>;
  deckID: string;
}) => {
  try {
    await client.from("deck").delete().eq("id", deckID);
  } catch (e) {
    console.log("Error deleting deck", e);
  }
};

export const uploadToSupabaseBucket = async ({
  client,
  file,
  bucketName,
  uploadPath,
}: {
  client: SupabaseClient<Database>;
  file: File;
  bucketName: string;
  uploadPath: string;
}) => {
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(uploadPath, file, { upsert: true });
  if (error) {
    console.log("Error uploading file", error);
    throw new Error("Error uploading file");
  }
  return data;
};
