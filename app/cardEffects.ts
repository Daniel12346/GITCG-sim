import { addDice, discardCard, drawCards, subtractCost } from "./actions";
import {
  calculateAttackElementalReaction,
  calculateDamageAfterModifiers,
  createSummon,
  findDamageModifyingEffects,
  findEquippedCards,
  increaseEffectUsages,
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
  | "SWITCH_CHARACTER"
  | "END_PHASE";

type ExecuteEffectParams = {
  //TODO: move some params to the trigger context
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  effect: Effect;
  opponentDice: Dice;
  playerID?: string;
  triggerContext?: TriggerContext;
  thisCard?: CardExt;
  //the card that is being targeted by the activated card
  targetCards?: CardExt[];
  summons?: CardExt[];
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

const executeAttack = ({
  myCards,
  effect,
  opponentCards,
  myDice,
  opponentDice,
  thisCard,
  targetCards,
  baseDamage,
  damageElement,
  attackBaseEffectID,
}: ExecuteEffectParams & {
  attackBaseEffectID: string;

  baseDamage: number;
  damageElement?: DamageElement;
}) => {
  if (!thisCard) {
    return { errorMessage: "No card passed to effect" };
  }
  if (!targetCards || targetCards.length < 1) {
    return { errorMessage: "One target card is required" };
  }
  let myUpdatedCards = myCards;
  let opponentUpdatedCards = opponentCards;
  let {
    damage: damageBeforeElementalReactions,
    myUpdatedCards: myUpdatedCardsAfterDamage,
  } = calculateDamageAfterModifiers({
    baseDamage,
    myCards,
    opponentCards,
    myDice,
    opponentDice,
    thisCard,
    targetCards,
  });

  if (myUpdatedCardsAfterDamage) {
    myUpdatedCards = myUpdatedCardsAfterDamage;
  }
  //TODO: multiple target cards
  const targetCardId = targetCards[0].id;
  const attackerCardId = thisCard.id;
  const { opponentCardsAfterReaction, myCardsAfterReaction, reactions } =
    calculateAttackElementalReaction({
      damage: damageBeforeElementalReactions,
      damageElement,
      attackerCardId,
      targetCardId,
      myCards,
      opponentCards,
      attackBaseEffectID,
    });
  reactions?.forEach((reaction) => {
    console.log("reaction", reaction);
  });
  if (myCardsAfterReaction) {
    myUpdatedCards = myCardsAfterReaction;
  }
  if (opponentCardsAfterReaction) {
    opponentUpdatedCards = opponentCardsAfterReaction;
  }
  return { myUpdatedCards, opponentUpdatedCards };
};

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

//TODO: fix attack happening even when there's not enough dice
const makeNormalAttackExecuteFunction = (
  attackElement: DamageElement,
  baseDamage: number,
  attackBaseEffectID: string
): ExecuteEffect => {
  const execute = ({
    effect,
    myCards,
    opponentCards,
    thisCard,
    targetCards,
    myDice,
    opponentDice,
  }: //TODO: triggerContext,
  ExecuteEffectParams) => {
    thisCard =
      thisCard ||
      (effect && myCards.find((card) => card.id === effect.card_id));
    //the base damage of the attack
    if (!thisCard) {
      return { errorMessage: "No card passed to effect" };
    }
    if (!targetCards || targetCards.length < 1) {
      return { errorMessage: "One target card is required" };
    }
    //TODO: only use modifiers that activate before the attack?
    const { myUpdatedCards, errorMessage, opponentUpdatedCards } =
      executeAttack({
        myCards,
        effect,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        baseDamage,
        damageElement: attackElement,
        attackBaseEffectID,
      });
    return { myUpdatedCards, errorMessage, opponentUpdatedCards };
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
  reaction?: {
    name: ElementalReaction;
    resultingElement?: ElementName;
  };
  switched?: {
    from?: CardExt;
    to?: CardExt;
  };
};

export type EffectLogic = {
  triggerOn?: TriggerEvents;
  checkIfCanBeExecuted?: CheckIfEffectCanBeExecuted;
  execute: ExecuteEffect;
  requiredTargets?: number;
};

//only handles the execution, not the effect cost
export const effects: {
  [key: string]: EffectLogic;
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
      if (target.usages === null) {
        return { errorMessage: "Target card has usages" };
      }
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === target.id && card.usages !== null) {
          return {
            ...card,
            usages: card.usages - 1,
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
  //TODO: add other elemental relics

  //Changing Shifts
  "fb9696af-6916-4079-b9db-17cbfd941156": {
    triggerOn: ["SWITCH_CHARACTER"],
    //TODO: make checkIfCanBeExecuted function
    // checkIfCanBeExecuted: ({ effect }) => {
    //   // if (!triggerContext?.switched) {
    // },
    execute: ({ triggerContext, thisCard, effect, myCards }) => {
      thisCard =
        thisCard ||
        (effect && myCards.find((card) => card.id === effect.card_id));

      //if this effect was already used this turn, return
      if (effect.usages_this_turn === 1) {
        console.log("Effect already used this turn");
        return {};
      }
      let cost = triggerContext?.cost;
      if (!triggerContext) {
        return { errorMessage: "No trigger context" };
      }
      if (!["SWITCH_CHARACTER"].includes(triggerContext.eventType)) {
        return {};
      }
      try {
        //TODO: is this correct?
        cost = subtractCost({ ...cost }, { UNALIGNED: 1 }) as Cost;
      } catch (e) {
        console.log(e);
        //TODO: change error message
        return { errorMessage: "could not subtract" };
      } finally {
        return {
          modifiedCost: cost,
          //update this effect's usage on the card
          myUpdatedCards: myCards.map((card) => {
            if (card.id === thisCard?.id) {
              return {
                ...card,
                effects: increaseEffectUsages(
                  card,
                  effect.effect_basic_info_id!
                ),
              };
            } else {
              return card;
            }
          }),
        };
      }
    },
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
    execute: makeNormalAttackExecuteFunction(
      "ANEMO",
      1,
      "b4a1b3f5-45a1-4db8-8d07-a21cb5e5be11"
    ),
  },
  //Sucrose's Skill
  "54bf4d1a-18bd-4b09-80d1-6573acfcd5cf": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: ExecuteEffectParams) => {
      let baseDamage = 3;
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }

      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        effect,
        baseDamage,
        damageElement: "ANEMO",
        attackBaseEffectID: "54bf4d1a-18bd-4b09-80d1-6573acfcd5cf",
      });
      //set opponent's next character as active
      let opponentCharacters = opponentCards.filter(
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
      opponentUpdatedCards = opponentUpdatedCards?.map((card) => {
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
      });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
  // Sucrose's Burst
  "0fedcf14-f037-45a5-bfe7-81954da86c54": {
    requiredTargets: 1,
    execute: ({
      myCards,
      summons,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: //TODO: triggerContext,
    // triggerContext,
    ExecuteEffectParams) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        effect,
        baseDamage: 1,
        damageElement: "ANEMO",
        attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
      });
      if (!summons) {
        return { errorMessage: "No summons found" };
      }
      const { myUpdatedCards: myUpdatedCardsAfterSummon } = createSummon({
        summonBasicInfoID: "c9835b98-7a88-4493-9023-62f9ea7e729a",
        summons,
        //TODO: is this correct?
        myCards: myUpdatedCards || myCards,
        maxUsages: 3,
      });
      if (myUpdatedCardsAfterSummon) {
        myUpdatedCards = myUpdatedCardsAfterSummon;
      }

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
  //Kaeya's Normal Attack
  "b17045ef-f632-4864-b72d-c0cd048eb4b3": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction(
      "CRYO",
      2,
      "b17045ef-f632-4864-b72d-c0cd048eb4b3"
    ),
  },
  "124e3616-dc1d-48de-b9c5-2fb05e65a498": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: ExecuteEffectParams) => {
      let baseDamage = 3;
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        effect,
        baseDamage,
        damageElement: "CRYO",
        attackBaseEffectID: "124e3616-dc1d-48de-b9c5-2fb05e65a498",
      });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
  //Kaeya's Burst
  "f72c5197-0fea-451c-9756-76885ac144e1": {
    requiredTargets: 1,
    execute: ({
      myCards,
      summons,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: //TODO: triggerContext,
    // triggerContext,
    ExecuteEffectParams) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        effect,
        opponentDice,
        thisCard,
        targetCards,
        baseDamage: 1,
        damageElement: "CRYO",
        attackBaseEffectID: "f72c5197-0fea-451c-9756-76885ac144e1",
      });
      if (!summons) {
        return { errorMessage: "No summons found" };
      }
      const { myUpdatedCards: myUpdatedCardsAfterSummon } = createSummon({
        summonBasicInfoID: "529ec9d6-67ed-430a-acc2-22219f0880ef",
        isCreation: true,
        summons,
        //TODO: is this correct?
        myCards: myUpdatedCards || myCards,
        maxUsages: 3,
      });
      if (myUpdatedCardsAfterSummon) {
        myUpdatedCards = myUpdatedCardsAfterSummon;
      }

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
  //Diluc's Normal Attack
  "d0054e26-1bcd-45bf-9dbe-eaeac45b9048": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction(
      "PHYSICAL",
      2,
      "d0054e26-1bcd-45bf-9dbe-eaeac45b9048"
    ),
  },

  //Diluc's Skill
  "9b20f340-e91f-4831-b768-7e7ee0ced987": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: //TODO: triggerContext,
    // triggerContext,
    ExecuteEffectParams) => {
      let baseDamage = 3;
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      if ((effect.usages_this_turn || 0) + 1 == 3) {
        baseDamage = 5;
      }
      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        effect,
        baseDamage,
        damageElement: "PYRO",
        attackBaseEffectID: "9b20f340-e91f-4831-b768-7e7ee0ced987",
      });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },

  //Diluc's Burst
  "1b5317e6-59db-4e53-bdc5-3e6923433b70": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCard,
      targetCards,
      myDice,
      opponentDice,
      effect,
    }: ExecuteEffectParams) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        baseDamage: 8,
        damageElement: "PYRO",
        attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
        effect,
      });
      //add status PYRO_INFUSION to Diluc
      myUpdatedCards = (myUpdatedCards || myCards).map((card) => {
        if (card.id === thisCard.id) {
          return {
            ...card,
            statuses: card.statuses
              ? [
                  ...card.statuses,
                  {
                    name: "PYRO_INFUSION",
                    turnsLeft: 2,
                  },
                ]
              : ["PYRO_INFUSION"],
          };
        } else {
          return card;
        }
      });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },

  //---------------SUMMONS----------------
  //Large Wind Spirit - End Phase Effect
  "0f9f109f-3310-46df-a18a-3a659181c23e": {
    triggerOn: ["END_PHASE"],
    execute: ({
      thisCard,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      effect,
    }) => {
      //TODO? check if it is the end phase

      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }

      const targetCards = opponentCards.filter(
        (card) => card.location === "CHARACTER" && card.is_active
      );

      let { myUpdatedCards, opponentUpdatedCards } = executeAttack({
        myCards,
        opponentCards,
        myDice,
        opponentDice,
        thisCard,
        targetCards,
        effect,
        baseDamage: 2,
        damageElement: thisCard.element || "ANEMO",
        attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
      });

      const thisEffect = thisCard.effects.find(
        (effect) => effect.id === "0f9f109f-3310-46df-a18a-3a659181c23e"
      );
      if (thisCard.max_usages !== undefined && thisCard.max_usages !== null) {
        if (myUpdatedCards && thisCard.usages === thisCard.max_usages) {
          //removing the summon
          myUpdatedCards = myUpdatedCards.filter(
            (card) => card.id !== thisCard.id
          );
        }
      }
      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
  //Large Wind Spirit - On Reaction Effect
  "d10fc5e1-231c-41f2-8a27-594e4777c795": {
    triggerOn: ["REACTION"],
    execute: ({
      effect,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      thisCard,
      triggerContext,
    }) => {
      thisCard =
        thisCard ||
        (effect && myCards.find((card) => card.id === effect.card_id));
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!triggerContext) {
        return { errorMessage: "No trigger context" };
      }
      const { reaction } = triggerContext;
      if (!reaction) {
        return { errorMessage: "No reaction found" };
      }
      if (
        triggerContext.eventType !== "REACTION" ||
        reaction.name !== "SWIRL"
      ) {
        return {
          errorMessage: "Effect can only be triggered on swirl reactions",
        };
      }
      const swirledElement = reaction.resultingElement;
      if (!swirledElement) {
        return { errorMessage: "No swirled element found" };
      }
      //change the element of the summon to the swirled element
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === thisCard.id) {
          return { ...card, element: swirledElement };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },
  //Icicle
  "bd921199-ac91-4a61-b803-20879d8d5dc7": {
    triggerOn: ["SWITCH_CHARACTER"],
    execute: ({
      effect,
      thisCard,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      triggerContext,
    }) => {
      thisCard =
        thisCard ||
        (effect && myCards.find((card) => card.id === effect.card_id));
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }

      const switchedToCard = triggerContext?.switched?.to;
      if (!switchedToCard) {
        return { errorMessage: "No switched card found" };
      }
      //effect only trigger if this creation's owner is the one switching
      const didISwitch = myCards.find((card) => card.id === switchedToCard.id);
      if (!didISwitch) {
        return {};
      }

      const targetCards = opponentCards.filter(
        (card) => card.location === "CHARACTER" && card.is_active
      );

      let { myUpdatedCards, opponentUpdatedCards, errorMessage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCard,
          targetCards,
          baseDamage: 2,
          damageElement: "CRYO",
          effect,
          attackBaseEffectID: "bd921199-ac91-4a61-b803-20879d8d5dc7",
        });

      if (errorMessage) {
        return { errorMessage };
      }
      //TODO!: update summon usages in the attack execution
      const thisCardAfterAttack = (myUpdatedCards || myCards).find(
        (card) => card.id === thisCard.id
      );
      const { usages, max_usages } = thisCardAfterAttack || {};
      if (
        myUpdatedCards &&
        usages !== undefined &&
        max_usages !== undefined &&
        usages !== null &&
        max_usages !== null
      ) {
        if (usages + 1 === max_usages) {
          myUpdatedCards = myUpdatedCards.filter(
            (card) => card.id !== thisCard.id
          );
        } else {
          myUpdatedCards = myUpdatedCards.map((card) => {
            console.log("usages", usages);
            if (card.id === thisCard.id) {
              return { ...card, usages: usages + 1 };
            }
            return card;
          });
        }
      }
      return {
        myUpdatedCards,
        opponentUpdatedCards,
      };
    },
  },
};

export const findEffectLogic = (effect: Effect) => {
  //TODO: does effect_basic_info_id really always exist?
  const basicInfoId = effect.effect_basic_info_id!;
  console.log("basicInfoId", basicInfoId, effects, effects[basicInfoId]);
  return effects[basicInfoId];
};
