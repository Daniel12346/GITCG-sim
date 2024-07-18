import { addDice, discardCard, drawCards, subtractCost } from "./actions";
import { findDamageModifyingEffects, findEquippedCards } from "./utils";

//TODO: add missing events
export type EventType =
  | "ACTIVATION"
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

type CanExecuteEffectParams = {
  myCards?: CardExt[];
  opponentCards?: CardExt[];
  triggerContext?: TriggerContext;
  effect?: Effect;
  thisCard?: CardExt;
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
      return { errorMessage: "Wrong trigger context" };
    }
    try {
      cost = subtractCost({ ...cost }, { [element]: 1 }) as Cost;
    } finally {
      return { modifiedCost: cost };
    }
  };
};

type MakeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage = (
  weapon_type: string
) => {
  canExecute: CanExecuteEffect;
  execute: ExecuteEffect;
};
//used to make the execute and canExecute functions of a weapon with +1 damage
const makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage: MakeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage =
  (weapon_type: string) => {
    return {
      canExecute: ({ triggerContext }) => {
        //TODO: throw an error if the weapon_type is not sword
        if (triggerContext?.targetCard?.weapon_type === weapon_type)
          return {
            errorMessage: "Wrong weapon type",
          };
      },
      execute: ({ triggerContext }) => {
        return triggerContext?.damage
          ? { modifiedDamage: triggerContext.damage + 1 }
          : { errorMessage: "No damage found" };
      },
    };
  };

export type CanExecuteEffect = (
  params: CanExecuteEffectParams
) => { errorMessage?: string } | void;
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

export type TriggerEvent = EventType | EventType[] | null;
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

type Execution = {
  //TODO: is there a better way to do this?
  requiredTargets?: number;
  //null would mean that the effect is activated immediately
  triggerOn?: TriggerEvent;
  //TODO: use a canBeActivated function instead?
  canExecute?: CanExecuteEffect;
  execute: ExecuteEffect;
};

//only handles the execution, not the effect cost
export const effects: { [key: string]: Execution } = {
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
    //TODO: set trigger to "ON_ACTIVATION"
    execute: ({ thisCard, myCards, myDice }) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      //calculating the total cost of the activated card because it might change during the game
      let cardCostTotal = 0;
      const cost = thisCard.cost;
      if (!cost) {
        return { errorMessage: "No cost found for card" };
      }
      Object.keys(cost).forEach((element) => {
        cardCostTotal += cost[element as CostElementName]!;
      });

      const available_dice = addDice(myDice, {
        OMNI: cardCostTotal,
      });
      return { myUpdatedDice: available_dice };
    },
  },
  //Guardian's Oath
  "2c4dfe38-cb2f-44d1-a40f-58feec6f8dbd": {
    execute: ({ myCards, opponentCards }) => {
      const destroySummons = (cards: CardExt[]) => {
        return cards.map((card) => {
          //TODO: check the constants used for location
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
    canExecute: ({ targetCards, myCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        return { errorMessage: "No target card found" };
      }
      if (target.location !== "SUMMON") {
        return { errorMessage: "Target card is not a summon card" };
      }
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
  //TODO: finish this
  "369a3f69-dc1b-49dc-8487-83ad8eb6979d": {
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
      //TODO: deep copy?
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
    execute: ({ myCards }) => {
      const myUpdatedCards = drawCards(myCards, 2);
      return { myUpdatedCards };
    },
  },
  //TODO: make copies for other elements
  //Mask of Solitude Basalt
  "85247510-9f6b-4d6e-8da0-55264aba3c8b": {
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost("GEO"),
  },
  //Viridescent Venerer's Diadem
  "176b463b-fa66-454b-94f6-b81a60ff5598": {
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost("ANEMO"),
  },

  //Traveler's Handy Sword
  "e565dda8-5269-4d15-a31c-694835065dc3":
    makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage("SWORD"),
  "b9c55fd7-53df-45a5-9414-69fb476d2bf8":
    //White Iron Greatsword
    makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage("CLAYMORE"),
  "90a07945-88d6-468e-96d8-32c2e6c19835":
    //White Tassel
    makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage("POLEARM"),
  "6d9e0cde-a9f7-4056-bebb-a2dfc7020320":
    //Magic Guide
    makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage("CATALYST"),
  "66cb8a2d-1f66-4229-96c0-cb91bd36e0d9":
    //Raven's Bow
    makeExecuteAndCanExecuteFunctionsOfWeaponWithPlus1Damage("BOW"),
  //--------------ATTACKS------------------

  "b4a1b3f5-45a1-4db8-8d07-a21cb5e5be11": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      //TODO: triggerContext,
      // triggerContext,
    }) => {
      //the base damage of the attack
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let damage = 1;
      const damageModifiers = findDamageModifyingEffects(myCards);
      damageModifiers.forEach((effect) => {
        if (
          effect?.execute &&
          ((effect?.canExecute &&
            effect.canExecute({ myCards, opponentCards })) ||
            !effect.canExecute)
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
              //TODO: add targetCard
              targetCard: targetCards[0],
            },
          });
          if (modifiedDamage) {
            damage = modifiedDamage;
          }
        }
      });
      console.log("damage", damage);

      //TODO: increase attack counter on attacker card
      const opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCards[0].id) {
          //TODO: add elemental reactions
          return {
            ...card,
            health: card.health ? card.health - damage : 0,
          };
        } else {
          return card;
        }
      });
      return { opponentUpdatedCards };
    },
  },
};
export default effects;
