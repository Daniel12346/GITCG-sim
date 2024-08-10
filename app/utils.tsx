import { uuid } from "uuidv4";
import effects, {
  EventType,
  ExecuteEffect,
  TriggerEvents,
} from "./cardEffects";
import { SupabaseClient } from "@supabase/supabase-js";
import { DieElementNameT } from "./global";

type CardBasicInfo = Database["public"]["Tables"]["card_basic_info"]["Row"];
export const cardFromBasicInfo = (
  cardBasicInfo: CardBasicInfo,
  ownerID?: string
): CardExt => {
  const cardID = uuid();
  return {
    ...cardBasicInfo,
    //TODO: do not ts ignore
    //@ts-ignore
    quantity: cardBasicInfo.quantity || null,
    //TODO: make cardType either nullalble or non-nullable for both cardBasicInfo and card
    card_type: cardBasicInfo.card_type ?? "",
    counters: 0,
    location: cardBasicInfo.card_type === "CHARACTER" ? "CHARACTER" : "DECK",
    id: cardID,
    card_basic_info_id: cardBasicInfo.id,
    energy: 0,
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

    //@ts-ignore
    effects: cardBasicInfo.effect_basic_info.map(
      (effectBasicInfo: any): Effect => {
        let execute: ExecuteEffect | undefined;
        let triggerOn: TriggerEvents | undefined;
        let requiredTargets: number | undefined;
        const effectLogic = effects[effectBasicInfo.id];
        if (effectLogic) {
          execute = effectLogic.execute;
          triggerOn = effectLogic.triggerOn;
          requiredTargets = effectLogic.requiredTargets;
        }

        return {
          ...effectBasicInfo,
          id: uuid(),
          effect_basic_info_id: effectBasicInfo.id,
          card_id: cardID,
          // card_basic_infoId: cardBasicInfo.id,
          total_usages: 0,
          usages_this_turn: 0,
          costJson: effectBasicInfo.cost,
          effect_basic_infoIdId: effectBasicInfo.id,
          cost: effectBasicInfo.cost as Dice,
          execute,
          triggerOn,
          requiredTargets,
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
  console.log("currentQuantity", currentQuantity);
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
  console.log(result);
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
  console.log(result);
  result.error && console.log(result.error);
  return result;
};

export const findEquippedCards = (target: CardExt, playerCards: CardExt[]) => {
  return playerCards.filter((card) => card.equippedTo === target.id);
};

export const findCostModifyingEffects = (cards: CardExt[]) => {
  return cards.reduce((acc, card) => {
    //TODO: add other allowed locations
    return ["ACTION", "EQUIPPED"].includes(card.location!)
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

export const findDamageModifyingEffects = (
  cards: CardExt[],
  trigger?: EventType
) => {
  return cards.reduce((acc, card) => {
    return ["ACTION", "EQUIPPED"].includes(card.location!)
      ? acc.concat(
          card.effects.filter(
            (effect) =>
              effect.effectType === "DAMAGE_MODIFIER" &&
              (trigger ? effect.triggerOn?.includes(trigger) : true)
          )
        )
      : acc;
  }, [] as Effect[]);
};

export const findEffectsThatTriggerOn = (
  trigger: EventType,
  cards: CardExt[]
) => {
  return cards.reduce((acc, card) => {
    return ["ACTION", "EQUIPPED"].includes(card.location!)
      ? acc.concat(
          card.effects.filter((effect) => effect.triggerOn?.includes(trigger))
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
}: {
  baseDamage: number;
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  opponentDice: Dice;
  thisCard: CardExt;
  targetCards: CardExt[];
}) => {
  let damage = baseDamage;
  const damageModifiers = findDamageModifyingEffects(myCards);
  damageModifiers.forEach((effect) => {
    if (
      effect?.execute &&
      ((effect?.checkIfCanBeExecuted &&
        effect.checkIfCanBeExecuted({ myCards, opponentCards })) ||
        !effect.checkIfCanBeExecuted)
    ) {
      const { modifiedDamage } = effect.execute({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        triggerContext: {
          eventType: "ATTACK",
          damage,
          attackerCard: thisCard,
          targetCard: targetCards[0],
        },
      });
      if (modifiedDamage) {
        damage = modifiedDamage;
      }
    }
  });
  return damage;
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

// const calculateElementalReaction = (
//   newElement: DieElementNameT,
//   oldElement: DieElementNameT
// ) => {
//   if (newElement === "PYRO" && oldElement === "CRYO") {
//     return "MELT";
//   }
//   if (newElement === "HYDRO" && oldElement === "PYRO") {
//     return "VAPORIZE";
//   }
//   if (newElement === "ELECTRO" && oldElement === "HYDRO") {
//     return "OVERLOADED";
//   }
//   if (newElement === "CRYO" && oldElement === "ELECTRO") {
//     return "SUPERCONDUCT";
//   }
//   if (newElement === "ELECTRO" && oldElement === "HYDRO") {
//     return "ELECTROCHARGED";
//   }
// };

type CalculateAttackElementalReaction = ({
  damage,
  damageElement,
  attackerCardId,
  targetCardId,
}: {
  damage: number;
  damageElement: DamageElement;
  attackerCardId: string;
  targetCardId: string;
  myCards: CardExt[];
  opponentCards: CardExt[];
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

//TODO: rename because this also calculates damage (?)
export const calculateAttackElementalReaction: CalculateAttackElementalReaction =
  ({
    damage,
    damageElement,
    attackerCardId,
    targetCardId,
    myCards,
    opponentCards,
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

    //  if (damageElement === "PHYSICAL") {
    //    return { updatedDamage: damage };
    //  }
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
    let reactions = [];
    let opponentUpdatedCards = opponentCards;
    //vaporize
    if (
      reactingElements.includes("PYRO") &&
      reactingElements.includes("HYDRO")
    ) {
      damageAfterReaction += 2;
      reactions.push("VAPORIZE");
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["PYRO", "HYDRO"]);
        }
        return card;
      });
      //electrocharged
    } else if (
      reactingElements.includes("HYDRO") &&
      reactingElements.includes("ELECTRO")
    ) {
      damageAfterReaction += 1;
      reactions.push("ELECTROCHARGED");
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, ["HYDRO", "ELECTRO"]);
          //doing 1 damage to all characters except the target
        } else if (card.location === "CHARACTER") {
          const updatedHealth = card.health && Math.max(0, card.health - 1);
          return { ...card, health: updatedHealth };
        } else {
          return card;
        }
      });
    } else if (
      //swirl
      targetStatuses.find((status: CardStatus) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      ) &&
      damageElement === "ANEMO"
    ) {
      console.log("swirl", targetStatuses);
      const elementToSwirl = targetStatuses.find((status) =>
        ["PYRO", "HYDRO", "ELECTRO", "CRYO"].includes(status.name)
      );
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return clearCardStatuses(card, [elementToSwirl?.name]);
        }
        return card;
      });
      damageAfterReaction += 1;
      const swirlTargets = opponentCards.filter(
        (card) => card.location === "CHARACTER" && card.id !== targetCardId
      );
      swirlTargets.forEach((card) => {
        const { reactions, opponentCardsAfterReaction, myCardsAfterReaction } =
          calculateAttackElementalReaction({
            damage: 1,
            damageElement: elementToSwirl?.name,
            attackerCardId,
            targetCardId: card.id,
            myCards,
            opponentCards: opponentUpdatedCards,
          });
        reactions && reactions.forEach((reaction) => reactions.push(reaction));
        if (opponentCardsAfterReaction) {
          opponentUpdatedCards = opponentCardsAfterReaction;
        }
      });
    } else {
      console.log(targetStatuses);
      //adding the attacking element to the target's statuses if no other reaction happened
      opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCardId) {
          return {
            ...card,
            statuses: [
              ...(card.statuses || []),
              { name: damageElement, turnsLeft: 1 },
            ],
          } as CardExt;
        }
        return card;
      });
    }
    opponentUpdatedCards = opponentUpdatedCards.map((card) => {
      const updatedHealth =
        card.health && Math.max(0, card.health - damageAfterReaction);

      if (card.id === targetCardId) {
        return { ...card, health: updatedHealth };
      }
      return card;
    });

    return {
      opponentCardsAfterReaction: opponentUpdatedCards,
      myCardsAfterReaction: myCards,
    };
  };
