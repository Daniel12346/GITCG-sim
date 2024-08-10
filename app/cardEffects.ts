import { addDice, discardCard, drawCards, subtractCost } from "./actions";
import {
  calculateAttackElementalReaction,
  calculateDamageAfterModifiers,
  findDamageModifyingEffects,
  findEquippedCards,
} from "./utils";

//TODO: add missing events
export type EventType =
  | "THIS_CARD_ACTIVATION"
  | "CARD_ACTIVATION"
  | "ATTACK"
  | "REACTION"
  | "EQUIP_TALENT"
  | "EQUIP_ARTIFACT"
  | "EQUIP_WEAPON"
  | "SWITCH";

type ExecuteEffectParams = {
  //TODO: move some params to the trigger context
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  opponentDice: Dice;
  playerID?: string;
  triggerContext?: TriggerContext;
  effect?: Effect;
  thisCard?: CardExt;
  //the card that is being targeted by the activated card
  targetCards?: CardExt[];
};

type CheckIfEffectCanBeExecutedParams = {
  myCards?: CardExt[];
  opponentCards?: CardExt[];
  triggerContext?: TriggerContext;
  effect?: Effect;
  thisCard?: CardExt;
  opponentDice?: Dice;
  playerID?: string;
  myDice?: Dice;
  //the card that is being targeted by the activated card
  targetCards?: CardExt[];
  //TODO: add more params
};

//TODO: update only cards that have changed
//type myUpdatedCards = {[id: string]: CardExt}

// export type ExecuteEffect = (params: Params) => {
//   //return all cards, including the ones that haven't changed
//   myUpdatedCards?: CardExt[];
//   myUpdatedDice?: Dice;
//   opponentUpdatedCards?: CardExt[];
//   opponentUpdatedDice?: Dice;
//   errorMessage?: string;
// };

//TODO: add trigger
//used to make the execute effect functions of 6 relics with their only difference being the element, all with the cost of 2 unaligned
const makeExecuteFunctionOfElementalRelicWith2UnalignedCost = (
  element: CostElementName
): ExecuteEffect => {
  return ({ triggerContext }) => {
    //TODO: check if this card is equipped
    let cost = triggerContext?.cost;
    if (!triggerContext) {
      return { errorMessage: "No trigger context" };
    }
    if (!["ATTACK", "EQUIP_TALENT"].includes(triggerContext.eventType)) {
      return {};
    }
    try {
      cost = subtractCost({ ...cost }, { [element]: 1 }) as Cost;
    } finally {
      return { modifiedCost: cost };
    }
  };
};

type MakeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage =
  (weapon_type: string) => {
    checkIfCanBeExecuted: CheckIfEffectCanBeExecuted;
    execute: ExecuteEffect;
    triggerOn?: TriggerEvents;
  };
//used to make the execute and checkIfCanBeExecuted functions of a weapon with +1 damage
const makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage: MakeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage =
  (weapon_type: string) => {
    return {
      //TODO: how to display the damage increase on the character if it's only triggered on attack?
      triggerOn: ["ATTACK"],
      checkIfCanBeExecuted: ({ triggerContext }) => {
        //TODO: throw an error if the weapon_type is not sword
        if (triggerContext?.targetCard?.weapon_type === weapon_type)
          return {
            errorMessage: "Wrong weapon type",
          };
        return {};
      },
      execute: ({ triggerContext }) => {
        return triggerContext?.damage
          ? { modifiedDamage: triggerContext.damage + 1 }
          : { errorMessage: "No damage found" };
      },
    };
  };

const makeNormalAttackExecuteFunction = (
  attackElement: ElementName,
  baseDamage: number
): ExecuteEffect => {
  const execute = ({
    myCards,
    opponentCards,
    thisCard,
    targetCards,
    myDice,
    opponentDice,
  }: //TODO: triggerContext,
  // triggerContext,
  ExecuteEffectParams) => {
    //the base damage of the attack
    if (!thisCard) {
      return { errorMessage: "No card passed to effect" };
    }
    if (!targetCards || targetCards.length < 1) {
      return { errorMessage: "One target card is required" };
    }
    //TODO: only use modifiers that activate before the attack?
    let damageBeforeElementalReactions = calculateDamageAfterModifiers({
      baseDamage,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      thisCard,
      targetCards,
    });
    const targetCardId = targetCards[0].id;
    const attackerCardId = thisCard.id;
    const { opponentCardsAfterReaction, myCardsAfterReaction, reactions } =
      calculateAttackElementalReaction({
        damage: damageBeforeElementalReactions,
        damageElement: attackElement,
        attackerCardId,
        //TODO: what if there are multiple target cards?
        targetCardId,
        myCards,
        opponentCards,
      });
    reactions?.forEach((reaction) => {
      console.log("reaction", reaction);
    });

    //TODO: increase attack counter on attacker card, trigger effects after attack or reaction
    return {
      myUpdatedCards: myCardsAfterReaction,
      opponentUpdatedCards: opponentCardsAfterReaction,
    };
  };
  return execute;
};

export type CheckIfEffectCanBeExecuted = (
  params: CheckIfEffectCanBeExecutedParams
) => { errorMessage?: string };
export type ExecuteEffect = (params: ExecuteEffectParams) => {
  //return all cards, including the ones that haven't changed
  myUpdatedCards?: CardExt[];
  myUpdatedDice?: Dice;
  opponentUpdatedCards?: CardExt[];
  opponentUpdatedDice?: Dice;
  errorMessage?: string;
  modifiedCost?: Cost;
  modifiedDamage?: number;
};

export type TriggerEvents = EventType[] | null;
export type TriggerContext = {
  //will be used with cost reduction effects
  eventType: EventType;
  attackerCard?: CardExt;
  //can be used both for attacks and equips
  targetCard?: CardExt;
  attackID?: string;
  cost?: Cost;
  damage?: number;
};

//only handles the execution, not the effect cost
export const effects: {
  [key: string]: Pick<
    Effect,
    "triggerOn" | "checkIfCanBeExecuted" | "execute" | "requiredTargets"
  >;
} = {
  //Chang the Ninth
  //TODO: when and how should this be executed?
  // "7c59cd7c-68d5-4428-99cb-c245f7522b0c": {
  //   //???????
  //   trigger: "REACTION",
  //   execute: ({ myCards, opponentCards }) => {
  //     return { ...myCards };
  //   },
  // },

  //The Bestest Travel Companion!
  "c4ba57f8-fd10-4d3c-9766-3b9b610de812": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ thisCard, myCards, myDice, triggerContext }) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      const cost = triggerContext?.cost;
      if (!cost) {
        return { errorMessage: "No cost found" };
      }

      const available_dice = addDice(myDice, {
        // OMNI: cardCostTotal,
        //TODO:
      });
      return { myUpdatedDice: available_dice };
    },
  },
  //Guardian's Oath
  "2c4dfe38-cb2f-44d1-a40f-58feec6f8dbd": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myCards, opponentCards }) => {
      const destroySummons = (cards: CardExt[]) => {
        return cards.map((card) => {
          if (card.location === "SUMMON") {
            return {
              ...card,
              location: "DISCARDED",
              //TODO: make a function for resetting cards
              effects: [],
              counters: 0,
            } as CardExt;
          } else {
            return card;
          }
        });
      };
      const myUpdatedCards = destroySummons(myCards);
      const opponentUpdatedCards = destroySummons(opponentCards);
      return { myUpdatedCards, opponentUpdatedCards };
    },
  },

  //Send Off
  "be33cd23-5caf-4aa4-8065-ce01fbaa8326": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    requiredTargets: 1,
    execute: ({ targetCards, myCards, opponentCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        return { errorMessage: "No target card found" };
      }
      if (target.location !== "SUMMON") {
        return { errorMessage: "Target card is not a summon card" };
      }
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === target.id) {
          return discardCard(card);
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },

  //Quick Knit
  "a15baf43-884b-4e7d-86a7-9f3261d4d7f5": {
    requiredTargets: 1,
    triggerOn: ["THIS_CARD_ACTIVATION"],
    checkIfCanBeExecuted: ({ targetCards, myCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        return { errorMessage: "No target card found" };
      }
      if (target.location !== "SUMMON") {
        return { errorMessage: "Target card is not a summon card" };
      }
      return {};
    },
    execute: ({ targetCards, myCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        return { errorMessage: "No target card found" };
      }
      if (target.location !== "SUMMON") {
        return { errorMessage: "Target card is not a summon card" };
      }
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === target.id) {
          return {
            ...card,
            usages: card.usages ? card.usages + 1 : 1,
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },

  // //Blessing of the Divine Relic's Installation
  "ce166d08-1be9-4937-a601-b34835c97dd2": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ targetCards, myCards }) => {
      if (!targetCards || targetCards.length < 2) {
        return { errorMessage: "Two target cards are required" };
      }
      const [shiftFromTarget, shiftToTarget] = targetCards;
      if (!shiftFromTarget || !shiftToTarget) {
        return { errorMessage: "No target card found" };
      }
      if (
        shiftFromTarget.location !== "CHARACTER" ||
        shiftToTarget.location !== "CHARACTER"
      ) {
        return { errorMessage: "Target card is not a character card" };
      }
      const cardsEquippedToShiftFromTarget = findEquippedCards(
        shiftFromTarget,
        myCards
      );
      const artifactsEquippedToShiftFromTarget =
        cardsEquippedToShiftFromTarget.filter(
          (card) => card.subtype === "EQUIPMENT_ARTIFACT"
        );
      if (!artifactsEquippedToShiftFromTarget.length) {
        return { errorMessage: "No artifact found on the first target card" };
      }
      const artifactToShift: CardExt = artifactsEquippedToShiftFromTarget[0];
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === artifactToShift.id) {
          return {
            ...card,
            equippedTo: shiftToTarget.id,
          };
        } else {
          return card;
        }
      });

      return { myUpdatedCards };
    },
  },

  // Master of Weaponry
  "916e111b-1418-4aad-9854-957c4c07e028": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    //the effect targets character cards, the weapon does not need to be targeted because a character can only have one weapon at a time
    requiredTargets: 2,
    execute: ({ targetCards, myCards }) => {
      if (!targetCards || targetCards.length < 2) {
        return { errorMessage: "Two target cards are required" };
      }
      const [shiftFromTarget, shiftToTarget] = targetCards;
      if (!shiftFromTarget || !shiftToTarget) {
        return { errorMessage: "No target card found" };
      }
      if (
        shiftFromTarget.location !== "CHARACTER" ||
        shiftToTarget.location !== "CHARACTER"
      ) {
        return { errorMessage: "Target card is not a character card" };
      }
      const cardsEquippedToShiftFromTarget = findEquippedCards(
        shiftFromTarget,
        myCards
      );
      const weaponsEquippedToShiftFromTarget =
        cardsEquippedToShiftFromTarget.filter(
          (card) => card.subtype === "EQUIPMENT_WEAPON"
        );
      if (!weaponsEquippedToShiftFromTarget.length) {
        return { errorMessage: "No weapon found on the first target card" };
      }
      //TODO: select weapon
      const weaponToShift: CardExt = weaponsEquippedToShiftFromTarget[0];
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === weaponToShift.id) {
          return {
            ...card,
            equippedTo: shiftToTarget.id,
          };
        } else {
          return card;
        }
      });

      return { myUpdatedCards };
    },
  },

  //When the Crane Returned
  "369a3f69-dc1b-49dc-8487-83ad8eb6979d": {
    triggerOn: ["ATTACK"],
    //is skill the same as attack?
    // trigger: "ATTACK",
    execute: ({ myCards }) => {
      const myCharacters = myCards.filter(
        (card) =>
          card.location === "CHARACTER" && card.health && card.health > 0
      );
      const myPreviousActiveCharacterIndexAmongCharacters =
        myCharacters.findIndex((card) => card.is_active === true);

      let newActiveCharacterIndexAmongCharacters = -1;
      if (
        myPreviousActiveCharacterIndexAmongCharacters ===
        myCharacters.length - 1
      ) {
        newActiveCharacterIndexAmongCharacters = 0;
      } else {
        newActiveCharacterIndexAmongCharacters =
          myPreviousActiveCharacterIndexAmongCharacters + 1;
      }
      const previousCharacter =
        myCharacters[myPreviousActiveCharacterIndexAmongCharacters];
      const newActiveCharacter =
        myCharacters[newActiveCharacterIndexAmongCharacters];
      const myPreviousActiveCharacterIndex = myCards.findIndex(
        (card) => card.id === previousCharacter.id
      );
      const myNewActiveCharacterIndex = myCards.findIndex(
        (card) => card.id === newActiveCharacter.id
      );
      const myUpdatedCards = [...myCards];
      myUpdatedCards[myPreviousActiveCharacterIndex] = {
        ...myUpdatedCards[myPreviousActiveCharacterIndex],
        is_active: false,
      };
      myUpdatedCards[myNewActiveCharacterIndex] = {
        ...myUpdatedCards[myNewActiveCharacterIndex],
        is_active: true,
      };
      return { myUpdatedCards };
    },
  },

  //Strategize
  "0ecdb8f3-a1a3-4b3c-8ebc-ac0788e200ea": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myCards }) => {
      const myUpdatedCards = drawCards(myCards, 2);
      return { myUpdatedCards };
    },
  },
  //Mask of Solitude Basalt
  "85247510-9f6b-4d6e-8da0-55264aba3c8b": {
    triggerOn: ["ATTACK", "EQUIP_TALENT"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost("GEO"),
  },
  //Viridescent Venerer's Diadem
  "176b463b-fa66-454b-94f6-b81a60ff5598": {
    triggerOn: ["ATTACK", "EQUIP_TALENT"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost("ANEMO"),
  },

  //Traveler's Handy Sword
  "e565dda8-5269-4d15-a31c-694835065dc3":
    makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage(
      "SWORD"
    ),
  "b9c55fd7-53df-45a5-9414-69fb476d2bf8":
    //White Iron Greatsword
    makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage(
      "CLAYMORE"
    ),
  "90a07945-88d6-468e-96d8-32c2e6c19835":
    //White Tassel
    makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage(
      "POLEARM"
    ),
  "6d9e0cde-a9f7-4056-bebb-a2dfc7020320":
    //Magic Guide
    makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage(
      "CATALYST"
    ),
  "66cb8a2d-1f66-4229-96c0-cb91bd36e0d9":
    //Raven's Bow
    makeTriggerAndExecuteAndCheckIfCanBeExecutedFunctionsOfWeaponWithPlus1Damage(
      "BOW"
    ),
  //--------------ATTACKS------------------

  //Sucrose's Normal Attack
  "b4a1b3f5-45a1-4db8-8d07-a21cb5e5be11": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction("ANEMO", 1),
  },
  //Kaeya's Normal Attack
  "b17045ef-f632-4864-b72d-c0cd048eb4b3": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction("HYDRO", 2),
  },
  //Diluc's Normal Attack
  "d0054e26-1bcd-45bf-9dbe-eaeac45b9048": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction("PYRO", 2),
  },
};
export default effects;
