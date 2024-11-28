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
  location?: Database["public"]["Tables"]["card"]["Row"]["location"]
): CardExt => {
  const cardID = uuid();
  return {
    ...cardBasicInfo,
    element: (cardBasicInfo.element as ElementName) || null,
    //TODO: do not ts ignore
    //@ts-ignore
    quantity: cardBasicInfo.quantity || null,
    //TODO: make cardType either nullalble or non-nullable for both cardBasicInfo and card
    card_type: cardBasicInfo.card_type ?? "",
    counters: 0,
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
    equipped_to_id: null,
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
          //TODO: remove this
          effect_basic_infoIdId: effectBasicInfo.id,
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
  type?: string
) => {
  return playerCards.filter(
    (card) =>
      card.equippedTo === target.id &&
      (card.location !== "DISCARDED" ||
        (card.subtype === "EVENT_FOOD" && card.wasActivatedThisTurn)) &&
      (type ? card.subtype === type : true)
  );
};

export const findCostModifyingEffects = (cards: CardExt[]) => {
  return cards.reduce((acc, card) => {
    //TODO: add other allowed locations
    return ["ACTION", "EQUIPPED"].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects.filter((effect) => effect.effectType === "COST_MODIFIER")
        )
      : acc;
  }, [] as Effect[]);
};

export const findCostModifyingEffectsOfCardsEquippedTo = (
  target: CardExt,
  playerCards: CardExt[]
) => {
  const equippedCards = findEquippedCards(target, playerCards);
  return findCostModifyingEffects(equippedCards);
};

export const subtractCostAfterModifiers = ({
  baseCost,
  executeArgs,
  selectedDice,
}: {
  baseCost: Cost;
  executeArgs: Omit<ExecuteEffectParams, "effect">;
  selectedDice: Dice;
}) => {
  let modifiedCost = baseCost;
  let myUpdatedDice = executeArgs.myDice;
  let myUpdatedCards = executeArgs.myCards;
  const triggerContext = executeArgs.triggerContext;

  if (!triggerContext) {
    return { errorMessage: "No trigger context" };
  }
  const costModifyingEffects = findCostModifyingEffects(myUpdatedCards);
  //execute all cost modifying effects
  costModifyingEffects.forEach((effect) => {
    const effectLogic = findEffectLogic(effect);
    if (!effectLogic?.execute) return;
    let {
      modifiedCost: modifiedCostAfterCostModyfingEffect,
      errorMessage,
      myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
    } = effectLogic.execute({
      ...executeArgs,
      effect,
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
  executeArgs: Omit<ExecuteEffectParams, "effect">;
}) => {
  let modifiedCost = baseCost;
  const triggerContext = executeArgs.triggerContext;

  if (!triggerContext) {
    return { errorMessage: "No trigger context" };
  }
  const costModifyingEffects = findCostModifyingEffects(executeArgs.myCards);
  //execute all cost modifying effects
  costModifyingEffects.forEach((effect) => {
    const effectLogic = findEffectLogic(effect);
    if (!effectLogic?.execute) return;
    let { modifiedCost: modifiedCostAfterCostModyfingEffect } =
      effectLogic.execute({
        ...executeArgs,
        effect,
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

export const findDamageModifyingEffects = (
  cards: CardExt[],
  trigger?: EventType
) => {
  return cards.reduce((acc, card) => {
    return ["ACTION", "EQUIPPED"].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects.filter((effect) => {
            const effectLogic = findEffectLogic(effect);
            return (
              effect.effectType === "DAMAGE_MODIFIER" &&
              (trigger ? effectLogic.triggerOn?.includes(trigger) : true)
            );
          })
        )
      : acc;
  }, [] as Effect[]);
};

export const findEffectsThatTriggerOn = (
  trigger: EventType,
  cards: CardExt[],
  {
    includeCostModifiers = false,
    includeDamageModifiers = false,
  }: { includeCostModifiers?: boolean; includeDamageModifiers?: boolean } = {}
) => {
  return cards.reduce((acc, card) => {
    //only looking at cards in action, equipped or summon locations or null for creation cards
    return ["ACTION", "EQUIPPED", "SUMMON", null].includes(card.location!) ||
      (card.location === "DISCARDED" && card.wasActivatedThisTurn)
      ? acc.concat(
          card.effects.filter((effect) => {
            const effectLogic = findEffectLogic(effect);
            const includesTrigger = effectLogic.triggerOn?.includes(trigger);
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
        )
      : acc;
  }, [] as Effect[]);
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
  const damageModifyingEffects = findDamageModifyingEffects(myCards);
  damageModifyingEffects.forEach((effect) => {
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
          triggerContext: {
            eventType: "ATTACK",
            damage,
            attack: {
              attackerCard: thisCard,
              attackBaseEffectID: effect.effect_basic_info_id,
            },
            targetCard: targetCards[0],
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
}: {
  damage: number;
  attackerCardId: string;
  targetCardId: string;
  attackBaseEffectID: string;
  myCards: CardExt[];
  opponentCards: CardExt[];
  damageElement?: DamageElement;
  currentRound: number;
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
          //TODO: how much to increase duration by?
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
  }) => {
    if (!myCards || !opponentCards) {
      return {
        errorMessage: "My cards or opponent cards are missing",
      };
    }

    const attackerCard = myCards.find((card) => card.id === attackerCardId);
    const targetCard = opponentCards.find((card) => card.id === targetCardId);
    //TODO: check attacker statuses for elemental infusion
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
    //TODO: multiple infusions?
    if (infusionElement && damageElement === "PHYSICAL") {
      damageElement = infusionElement;
    }

    //  //TODO: check for shields
    //  if (damageElement === "PIERCING") {
    //    return { updatedDamage: damage };
    //  }
    //  if (!targetStatuses || targetStatuses.length === 0) {
    //    let updatedTargetStatuses = [
    //      { name: damageElement as ElementName, turnsLeft: 1 },
    //    ];
    //    return {
    //      updatedDamage: damage,
    //      updatedTargetCard: { ...targetCard, statuses: updatedTargetStatuses },
    //    };
    //  }
    const attackerStatuses = attackerCard.statuses;
    const targetStatuses = targetCard.statuses || [];

    const reactingElements = [
      ...targetStatuses.map((status) => status.name),
      damageElement,
    ];
    let damageAfterReaction = damage;
    let reactions: ElementalReaction[] = [];
    let opponentUpdatedCards = opponentCards;
    let myUpdatedCards = myCards;
    //refers to the element that was swirled, possibly other uses, TODO: rename
    let resultingElement: ElementName | null = null;
    //SHATTERED
    if (damageElement === "PHYSICAL") {
      if (
        targetStatuses.find((status: CardStatus) => status.name === "FROZEN")
      ) {
        damageAfterReaction += 2;
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
      damageAfterReaction += 2;
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
      damageAfterReaction += 2;
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
      damageAfterReaction += 1;
      reactions.push("ELECTROCHARGED");
      opponentUpdatedCards = opponentUpdatedCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["HYDRO", "ELECTRO"]);
          //doing 1 damage to all characters except the target
        } else if (card.location === "CHARACTER") {
          const updatedHealth = card.health && Math.max(0, card.health - 1);
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
      damageAfterReaction += 1;
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
      damageAfterReaction += 1;
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
      damageAfterReaction += 1;
      reactions?.push("CRYSTALLIZE");
    }
    //SUPERCONDUCT
    else if (
      reactingElements.includes("CRYO") &&
      reactingElements.includes("ELECTRO")
    ) {
      //TODO: check logic for superconduct
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["CRYO", "ELECTRO"]);
        }
        return card;
      });
      damageAfterReaction += 1;
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
      damageAfterReaction += 2;
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
      damageAfterReaction += 2;
      reactions.push("OVERLOADED");
      let opponentCharacters = opponentUpdatedCards.filter(
        (card) => card.location === "CHARACTER"
      );
      let previousActiveCharacterIndex = opponentCharacters.findIndex(
        (card) => card.is_active
      );
      if (previousActiveCharacterIndex === -1) {
        //TODO: throw an error
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
        !(damageElement === "PHYSICAL" || damageElement === "PIERCING")
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
      const damageToHealth =
        damageElement === "PIERCING"
          ? damageAfterReaction
          : damageAfterReaction - (card.shield || 0);
      const updatedHealth =
        card.health && Math.max(0, card.health - damageToHealth);

      if (card.id === targetCardId) {
        return { ...card, health: updatedHealth };
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
              //TODO: reset usages this turn
              usages_this_turn: usages_this_turn + 1,
              total_usages: total_usages + 1,
            };
          }
          return effect;
        });
        const currentEnergy = card.energy;
        const updatedEnergy =
          currentEnergy !== null
            ? //summon etc. don't have max_energy (?)
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

    const effectsThatTriggerOnReaction = findEffectsThatTriggerOn(
      "REACTION",
      //TODO!: handle opponent's effects
      [...myUpdatedCards]
    );
    if (effectsThatTriggerOnReaction.length > 0) {
      effectsThatTriggerOnReaction.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (
          effectLogic.execute &&
          ((effectLogic?.checkIfCanBeExecuted &&
            effectLogic.checkIfCanBeExecuted({
              effect,
              myCards,
              opponentCards,
              //TODO: add dice
              myDice: {},
              opponentDice: {},
              currentRound,
            })) ||
            !effectLogic.checkIfCanBeExecuted)
        ) {
          const {
            myUpdatedCards: myUpdatedCardsAfterEffects,
            opponentUpdatedCards: opponentUpdatedCardsAfterEffects,
          } = effectLogic.execute({
            effect,
            myCards: myUpdatedCards,
            opponentCards: opponentUpdatedCards,
            //TODO: add dice
            myDice: {},
            opponentDice: {},
            triggerContext: {
              eventType: "REACTION",
              reaction: {
                //TODO!: why is this undefined?
                name: reactions[0],
                resultingElement: resultingElement || undefined,
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
        }
      });
    }
    return {
      opponentCardsAfterReaction: opponentUpdatedCards,
      myCardsAfterReaction: myUpdatedCards,
      reactions,
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
  effects: Effect[];
  executeArgs: Omit<ExecuteEffectParams, "effect">;
};
export const executeEffectsSequentially = ({
  effects,
  executeArgs,
}: ExecuteEffectsSequentiallyParams) => {
  let myUpdatedCards = executeArgs.myCards;
  let myUpdatedDice = executeArgs.myDice;
  let opponentUpdatedCards = executeArgs.opponentCards;
  let opponentUpdatedDice = executeArgs.opponentDice;
  let errorMessage: string | null = null;

  effects.forEach((effect) => {
    if (errorMessage) return;
    const effectLogic = findEffectLogic(effect);

    if (!effectLogic.execute) return;
    // if (effectLogic.checkIfCanBeExecuted) {
    //   //TODO: is this necessary?
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
  executeArgs: Omit<ExecuteEffectParams, "effect">;
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
  const myEffectsThatTriggeOnPhase = findEffectsThatTriggerOn(
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
    effects: myEffectsThatTriggeOnPhase,
    executeArgs: {
      ...executeArgs,
      myCards: myUpdatedCards,
      myDice: myUpdatedDice,
      opponentCards: opponentUpdatedCards,
      opponentDice: opponentUpdatedDice,
      //TODO: is this necessary?
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
}: //TODO: implement!
// areMyEffectsFirst,
ExecutePhaseEffectsParams) => {
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
  //TODO: is this correct?
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
}: {
  channel: RealtimeChannel;
  playerID: string;
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
    }, 400);
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
  console.log("Deleting deck", deckID);
  //TODO: cascade delete
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
