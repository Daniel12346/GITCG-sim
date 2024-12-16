import { addDice, discardCard, drawCards, subtractCost } from "./actions";
import {
  calculateAttackElementalReaction,
  calculateDamageAfterModifiers,
  createSummon,
  findEquippedCards,
  increaseEffectUsages,
} from "./utils";

const executeAttack = ({
  myCards,
  opponentCards,
  myDice,
  opponentDice,
  targetCards,
  thisCardID,
  baseDamage,
  damageElement,
  attackBaseEffectID,
  currentRound,
}: ExecuteEffectParams & {
  attackBaseEffectID: string;

  baseDamage: number;
  damageElement?: DamageElement;
}) => {
  const thisCard = myCards.find((card) => card.id === thisCardID);
  if (!thisCardID || !thisCard) {
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
    currentRound,
  });

  if (myUpdatedCardsAfterDamage) {
    myUpdatedCards = myUpdatedCardsAfterDamage;
  }
  //TODO: multiple target cards?
  const targetCardId = targetCards[0].id;
  const attackerCardId = thisCard.id;
  const {
    opponentCardsAfterReaction,
    myCardsAfterReaction,
    reactions,
    updatedDamage,
  } = calculateAttackElementalReaction({
    damage: damageBeforeElementalReactions,
    damageElement,
    attackerCardId,
    targetCardId,
    myCards,
    opponentCards,
    attackBaseEffectID,
    currentRound,
    myDice,
    opponentDice,
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
  return { myUpdatedCards, opponentUpdatedCards, updatedDamage };
};

const makeExecuteFunctionOfElementalRelicWith2UnalignedCost = (
  element: CostElementName,
  baseEffectID: string
): ExecuteEffect => {
  return ({ triggerContext, myCards, thisCardID }) => {
    const thisCard = myCards.find((card) => card.id === thisCardID);
    if (!thisCardID || !thisCard) {
      return { errorMessage: "No card passed to effect" };
    }
    if (!triggerContext) {
      return { errorMessage: "No trigger context" };
    }
    const thisEffect = thisCard?.effects.find(
      (eff) => eff.effect_basic_info_id === baseEffectID
    );
    //returning {} means this effect won't affect the cost of the event or the state of the cards but it will not lead to an error
    if (thisEffect?.usages_this_turn && thisEffect.usages_this_turn >= 1) {
      return {};
    }
    if (!["ATTACK", "CARD_ACTIVATION"].includes(triggerContext.eventType)) {
      return {};
    }

    let cost = triggerContext.cost;
    let modifiedCost;
    console.log("trigger", thisCard, triggerContext);

    const activatedCard = triggerContext.activatedCard;
    if (triggerContext.eventType === "ATTACK") {
      const attackerCard = triggerContext.attack?.attackerCard;
      if (!attackerCard) {
        return {};
      }
      if (attackerCard.id !== thisCard?.equippedTo) {
        return {};
      }
    }
    //only reduce the cost if the activated card was a talent card
    if (triggerContext.eventType === "CARD_ACTIVATION") {
      if (!activatedCard || activatedCard.card_type !== "EQUIPMENT_TALENT") {
        return {};
      }
      const equipTarget = triggerContext.targetCards?.[0];
      //the  talent must be used on the card this card is equipped to
      if (!equipTarget || equipTarget.id !== thisCard?.equippedTo) {
        return {};
      }
    }

    try {
      modifiedCost = subtractCost({ ...cost }, { [element]: 1 }) as Cost;
      const myCardsWithUpdatedEffects = myCards.map((card) => {
        if (card.id === thisCard?.id) {
          return {
            ...card,
            effects: increaseEffectUsages(card, baseEffectID),
          };
        } else {
          return card;
        }
      });
      return { modifiedCost, myUpdatedCards: myCardsWithUpdatedEffects };
    } catch {
      //if the cost was not reduced, the effect usage is not increased
      return {};
    }
  };
};

type MakeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage = (
  weapon_type: string
) => {
  execute: ExecuteEffect;
  triggerOn?: TriggerEvents;
};
//used to make the execute and checkIfCanBeExecuted functions of a weapon with +1 damage
const makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage: MakeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage =
  (weapon_type: string) => {
    return {
      triggerOn: ["THIS_CARD_ACTIVATION", "ATTACK"],
      execute: ({ triggerContext, thisCardID, myCards }) => {
        const thisCard = myCards.find((card) => card.id === thisCardID);
        if (!thisCardID || !thisCard) {
          return { errorMessage: "No card passed to effect" };
        }

        if (triggerContext?.eventType === "THIS_CARD_ACTIVATION") {
          const target = triggerContext?.targetCards?.[0];
          if (!target) {
            return { errorMessage: "No target card found" };
          }
          if (target.location !== "CHARACTER") {
            return { errorMessage: "Target card is not a character card" };
          }
          if (target.weapon_type !== weapon_type) {
            return { errorMessage: "Target card has incorrect weapon type" };
          }
        } else if (triggerContext?.eventType === "ATTACK") {
          const attackerCard = triggerContext?.attack?.attackerCard;

          if (!attackerCard || attackerCard.id !== thisCard?.equippedTo) {
            return {};
          }
          return triggerContext?.damage
            ? { modifiedDamage: triggerContext.damage + 1 }
            : {};
        }
        return {};
      },
    };
  };

const makeNormalAttackExecuteFunction = (
  attackElement: DamageElement,
  baseDamage: number,
  attackBaseEffectID: string
): ExecuteEffect => {
  const execute = ({
    effect,
    myCards,
    opponentCards,
    thisCardID,
    targetCards,
    myDice,
    opponentDice,
    currentRound,
  }: ExecuteEffectParams) => {
    const thisCard = myCards.find((card) => card.id === thisCardID);
    if (!thisCardID || !thisCard) {
      return { errorMessage: "No card passed to effect" };
    }
    if (!targetCards || targetCards.length < 1) {
      return { errorMessage: "One target card is required" };
    }
    const {
      myUpdatedCards,
      errorMessage,
      opponentUpdatedCards,
      updatedDamage,
    } = executeAttack({
      myCards,
      effect,
      opponentCards,
      myDice,
      opponentDice,
      thisCardID,
      targetCards,
      baseDamage,
      damageElement: attackElement,
      attackBaseEffectID,
      currentRound,
    });
    return {
      myUpdatedCards,
      errorMessage,
      opponentUpdatedCards,
      modifiedDamage: updatedDamage,
    };
  };
  return execute;
};

//only handles the execution, not the effect cost
export const effects: {
  [key: string]: EffectLogic;
} = {
  //Chang the Ninth
  "7c59cd7c-68d5-4428-99cb-c245f7522b0c": {
    triggerOn: ["EITHER_PLAYER_REACTION"],
    execute: ({ myCards, triggerContext, thisCardID }) => {
      console.log(
        "Chang the Ninth effect",
        myCards,
        triggerContext,
        thisCardID
      );
      const thisCard = myCards.find((card) => card.id === thisCardID);
      let myUpdatedCards: CardExt[] | null = null;
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (triggerContext?.eventType !== "REACTION") {
        return {};
      }
      const { reaction, attack } = triggerContext;
      if (!reaction || !attack || reaction.cause !== "ATTACK") {
        return {};
      }

      const { damageElement, damageDealt } = attack;
      const reactionNames = reaction.names;
      //if a reaction was triggered by an attack or physical/piercing damage was dealt, increase the counter by 1
      if (
        !(
          reactionNames.length ||
          //don't increase counter if physical damage was prevented by shields (piercing damage can not be prevented by shields)
          (damageElement === "PHYSICAL" && damageDealt === 0) ||
          damageElement === "PIERCING"
        )
      ) {
        return {};
      }
      const counter = thisCard.counters?.find((c) => c.name === "INSPIRATION");
      const updatedCounter = counter ? counter.amount + 1 : 1;
      //if this card has 3 counters, discard it and draw 2 cards
      if (updatedCounter === 3) {
        myUpdatedCards = myCards.map((card) => {
          if (card.id === thisCard.id) {
            return {
              ...card,
              counters: [],
              location: "DISCARDED",
            };
          } else {
            return card;
          }
        });
        myUpdatedCards = drawCards(myUpdatedCards, 2);
      } else {
        //if this card has less than 3 counters, increase the counter by 1
        myUpdatedCards = myCards.map((card) => {
          if (card.id === thisCard.id) {
            return {
              ...card,
              counters: [
                ...(card.counters ?? []).filter(
                  (c) => c.name !== "INSPIRATION"
                ),
                {
                  name: "INSPIRATION",
                  amount: updatedCounter,
                },
              ],
            };
          } else {
            return card;
          }
        });
      }
      return { myUpdatedCards };
    },
  },

  //The Bestest Travel Companion!
  "c4ba57f8-fd10-4d3c-9766-3b9b610de812": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myDice }) => {
      const myUpdatedDice = addDice(myDice, {
        OMNI: 2,
      });
      return { myUpdatedDice };
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
              location: null,
              effects: [],
              counters: [],
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
    checkIfCanBeExecuted: ({ targetCards }) => {
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
            //TODO: is it + or -?
            usages: card.usages - 1,
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },

  //Blessing of the Divine Relic's Installation
  "ce166d08-1be9-4937-a601-b34835c97dd2": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
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
      //only one weapon can be equipped to a character
      const weaponToShift: CardExt = weaponsEquippedToShiftFromTarget[0];
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === weaponToShift.id) {
          //reset the weapon's effects' usages
          const updatedEffects = weaponToShift.effects.map((effect) => {
            return {
              ...effect,
              usages_this_turn: 0,
            };
          });
          return {
            ...card,
            equippedTo: shiftToTarget.id,
            effects: updatedEffects,
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
    execute: ({ myCards }) => {
      let myCharacters = myCards.filter(
        (card) => card.location === "CHARACTER"
      );
      let previousActiveCharacterIndex = myCharacters.findIndex(
        (card) => card.is_active
      );
      if (previousActiveCharacterIndex === -1) {
        previousActiveCharacterIndex = 0;
      }
      const nextActiveCharacterIndex =
        previousActiveCharacterIndex === myCharacters.length - 1
          ? 0
          : previousActiveCharacterIndex + 1;
      const previousActiveCharacter =
        myCharacters[previousActiveCharacterIndex];
      const nextActiveCharacter = myCharacters[nextActiveCharacterIndex];
      const myUpdatedCards = myCards?.map((card) => {
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
  //I Haven't Lost Yet!
  "a5d2e3db-ae67-4f1e-bf7c-80419e715d8e": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myCards, currentRound, myDice }: ExecuteEffectParams) => {
      const myCharacters = myCards.filter(
        (card) => card.location === "CHARACTER"
      );
      const wasCharacterDefatedThisTurn = myCharacters.some(
        (card) => card.defeatedInTurn === currentRound
      );
      if (!wasCharacterDefatedThisTurn) {
        return { errorMessage: "No character was defeated this turn" };
      }
      const myUpdatedDice = addDice(myDice, { OMNI: 1 });
      // add 1 energy to the active character
      const myUpdatedCards = myCards.map((card) => {
        if (card.location === "CHARACTER" && card.is_active) {
          return {
            ...card,
            energy: (card.energy ?? 0) + 1,
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards, myUpdatedDice };
    },
  },
  //Starsigns
  "d26da3e3-25b7-4434-983d-0d617fcd012f": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myCards }: ExecuteEffectParams) => {
      // add 1 energy to the active character
      const myUpdatedCards = myCards.map((card) => {
        if (card.location === "CHARACTER" && card.is_active) {
          return {
            ...card,
            energy: (card.energy ?? 0) + 1,
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },
  //Calx's Arts
  "1acc972c-4549-4533-926c-dc18af73eb0b": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({ myCards }: ExecuteEffectParams) => {
      //at most 2 inactive characters with energy are considered
      const inactiveCharactersWithAvailableEnergy = myCards
        .filter(
          (card) =>
            card.location === "CHARACTER" &&
            !card.is_active &&
            !(card.health === 0) &&
            card.energy != null &&
            card.energy > 0
        )
        .slice(0, 2);
      const energyToShift = inactiveCharactersWithAvailableEnergy.length;
      //shift 1 energy from each inactive character to the active character
      const myUpdatedCards = myCards.map((card) => {
        if (card.location !== "CHARACTER") {
          return card;
        }
        if (card.is_active) {
          return {
            ...card,
            //energy must not overcap
            //if active character has 1 missing energy and 1 energy is shifted from each inactive charaters, 1 energy will be wasted
            energy: Math.min(
              (card.energy ?? 0) + energyToShift,
              card.max_energy!
            ),
          };
        } else {
          if (
            inactiveCharactersWithAvailableEnergy.some(
              (target) => target.id === card.id
            )
          ) {
            return {
              ...card,
              //card.energy is not null because of the filter
              energy: card.energy! - 1,
            };
          } else {
            return card;
          }
        }
      });
      return { myUpdatedCards };
    },
  },
  //Mask of Solitude Basalt
  "85247510-9f6b-4d6e-8da0-55264aba3c8b": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "GEO",
      "85247510-9f6b-4d6e-8da0-55264aba3c8b"
    ),
  },
  //Viridescent Venerer's Diadem
  "176b463b-fa66-454b-94f6-b81a60ff5598": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "ANEMO",
      "176b463b-fa66-454b-94f6-b81a60ff5598"
    ),
  },
  //Witch's Scorching Hat
  "a43ca945-b79a-47b4-8043-9964004af01f": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "PYRO",
      "a43ca945-b79a-47b4-8043-9964004af01f"
    ),
  },
  //Broken Rime's Echo
  "5f3ed7ee-b221-467d-8772-27d5f6b84218": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "CRYO",
      "5f3ed7ee-b221-467d-8772-27d5f6b84218"
    ),
  },
  //Wine-Stained Tricorne
  "4834c506-eaac-42ec-b10f-8d1bbcc9e8db": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "HYDRO",
      "4834c506-eaac-42ec-b10f-8d1bbcc9e8db"
    ),
  },
  //Thunder Summoner's Crown
  "cef04fc2-6fc7-4eab-a3b2-3545c65f8dcd": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "ELECTRO",
      "cef04fc2-6fc7-4eab-a3b2-3545c65f8dcd"
    ),
  },
  //Laurel Coronet
  "0c6267cf-5fbd-4f89-901f-30b1fb47843b": {
    triggerOn: ["ATTACK", "CARD_ACTIVATION"],
    execute: makeExecuteFunctionOfElementalRelicWith2UnalignedCost(
      "DENDRO",
      "0c6267cf-5fbd-4f89-901f-30b1fb47843b"
    ),
  },

  //Changing Shifts
  "fb9696af-6916-4079-b9db-17cbfd941156": {
    triggerOn: ["SWITCH_CHARACTER"],
    execute: ({ triggerContext, thisCardID, effect, myCards }) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
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
        cost = subtractCost({ ...cost }, { UNALIGNED: 1 }) as Cost;
      } catch (e) {
        console.log(e);
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

  //Paimon
  "a54cd0e1-1d29-4404-8c20-768a0ce1d2f1": {
    triggerOn: ["ACTION_PHASE"],
    execute: ({ myCards, myDice }) => {
      const myUpdatedDice = addDice(myDice, { OMNI: 2 });
      //update this effect's usage
      const myUpdatedCards = myCards.map((card) => {
        return {
          ...card,
          effects: increaseEffectUsages(
            card,
            "a54cd0e1-1d29-4404-8c20-768a0ce1d2f1"
          ),
        };
      });
      return { myUpdatedDice, myUpdatedCards };
    },
  },

  //Leave It To Me!
  "11d9e029-7d7e-4239-904e-d3b6600f1c84": {
    triggerOn: ["SWITCH_CHARACTER"],
    execute: () => {
      return { isFastAction: true };
    },
  },
  //-----------------WEAPONS-------------------

  //Traveler's Handy Sword
  "e565dda8-5269-4d15-a31c-694835065dc3":
    makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage("SWORD"),
  "b9c55fd7-53df-45a5-9414-69fb476d2bf8":
    //White Iron Greatsword
    makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage("CLAYMORE"),
  "90a07945-88d6-468e-96d8-32c2e6c19835":
    //White Tassel
    makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage("POLEARM"),
  "6d9e0cde-a9f7-4056-bebb-a2dfc7020320":
    //Magic Guide
    makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage("CATALYST"),
  "66cb8a2d-1f66-4229-96c0-cb91bd36e0d9":
    //Raven's Bow
    makeTriggerAndExecuteFunctionOfWeaponWithPlus1Damage("BOW"),

  //-----------LOCATIONS----------------

  //Dawn Winery
  "540e9a74-9c09-4afe-b536-295e56dacc23": {
    triggerOn: ["SWITCH_CHARACTER"],
    execute: ({ triggerContext, thisCardID, effect, myCards }) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      //can be used twice per turn
      if (effect.usages_this_turn === 2) {
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
        cost = subtractCost({ ...cost }, { UNALIGNED: 1 }) as Cost;
      } catch (e) {
        console.log(e);
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

  //Favonius Cathedral
  "8e420462-0c36-42f7-aeef-520ca2129ce5": {
    triggerOn: ["END_PHASE"],
    execute: ({ myCards, thisCardID, effect }) => {
      //heal active character by 1
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      let hasHealed = false;
      let myUpdatedCards = myCards.map((card) => {
        if (card.location === "CHARACTER" && card.is_active) {
          if (card.health === card.base_health) {
            return card;
          } else {
            hasHealed = true;
            return {
              ...card,
              health: (card.health ?? 0) + 1,
            };
          }
        }
        return card;
      });
      // if the active character was already at full health this effect's usage is not increased
      if (hasHealed) {
        myUpdatedCards = myUpdatedCards.map((card) => {
          if (card.id === thisCard.id) {
            return {
              ...card,
              effects: increaseEffectUsages(
                card,
                "8e420462-0c36-42f7-aeef-520ca2129ce5"
              ),
            };
          }
          return card;
        });
      }
      return { myUpdatedCards };
    },
  },

  //---------------FOOD--------

  //Minty Meat Rolls
  "e1d9653d-4c9f-4e8c-803e-31d57fe5f7f7": {
    triggerOn: ["ATTACK"],
    execute: ({
      myCards,
      thisCardID,
      effect,
      triggerContext,
    }: ExecuteEffectParams) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!triggerContext) {
        return { errorMessage: "No trigger context" };
      }
      if (triggerContext.eventType !== "ATTACK") {
        return {};
      }
      const { attack, cost } = triggerContext;
      if (!attack) {
        return { errorMessage: "No attack found" };
      }
      if (!cost) {
        return { errorMessage: "No cost found" };
      }
      const { attackerCard, attackBaseEffectID } = attack;
      if (!attackerCard) {
        return { errorMessage: "No attacker card found" };
      }
      const attackEffect = attackerCard.effects.find(
        (effect: Effect) => effect.effect_basic_info_id === attackBaseEffectID
      );
      if (attackEffect?.effectType === "NORMAL_ATTACK") {
        if (effect.usages_this_turn != null && effect.usages_this_turn >= 3) {
          return {};
        }
        //reduce cost of the attack by 1 unaligned
        try {
          const modifiedCost = subtractCost(cost, { UNALIGNED: 1 });
          //increase the usage of this effect by 1
          const myUpdatedCards = myCards.map((card) => {
            if (card.id === thisCard.id) {
              return {
                ...card,
                effects: increaseEffectUsages(
                  card,
                  "e1d9653d-4c9f-4e8c-803e-31d57fe5f7f7"
                ),
              };
            } else if (card.id === attackerCard.id) {
              return { ...card, hasUsedFoodThisTurn: true };
            } else {
              return card;
            }
          });
          return { modifiedCost: modifiedCost, myUpdatedCards };
        } catch (e) {
          return { errorMessage: "could not subtract cost" };
        }
      } else {
        return {};
      }
    },
  },

  //Sweet Madame
  "ba297d06-89ee-4ae3-8c3e-460d71d0ba7a": {
    triggerOn: ["THIS_CARD_ACTIVATION"],
    execute: ({
      myCards,
      thisCardID,
      effect,
      targetCards,
    }: ExecuteEffectParams) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length !== 1) {
        return { errorMessage: "One target card is required" };
      }
      if (targetCards[0].location !== "CHARACTER") {
        return { errorMessage: "Target card is not a character card" };
      }
      const myUpdatedCards = myCards.map((card) => {
        if (card.id === targetCards[0].id) {
          return {
            ...card,
            health: (card.health ?? 0) + 1,
            hasUsedFoodThisTurn: true,
          };
        }
        if (card.id === thisCard.id) {
          return {
            ...card,
            effects: increaseEffectUsages(
              card,
              "ba297d06-89ee-4ae3-8c3e-460d71d0ba7a"
            ),
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },

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
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      let baseDamage = 3;
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }

      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCardID,
          targetCards,
          effect,
          baseDamage,
          damageElement: "ANEMO",
          attackBaseEffectID: "54bf4d1a-18bd-4b09-80d1-6573acfcd5cf",
          currentRound,
        });
      //set opponent's next character as active
      let opponentCharacters = opponentCards.filter(
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
        modifiedDamage: updatedDamage,
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
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCardID,
          targetCards,
          effect,
          baseDamage: 1,
          damageElement: "ANEMO",
          attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
          currentRound,
        });
      if (!summons) {
        return { errorMessage: "No summons found" };
      }
      const { myUpdatedCards: myUpdatedCardsAfterSummon } = createSummon({
        summonBasicInfoID: "c9835b98-7a88-4493-9023-62f9ea7e729a",
        summons,
        myCards: myUpdatedCards || myCards,
        maxUsages: 3,
      });
      if (myUpdatedCardsAfterSummon) {
        myUpdatedCards = myUpdatedCardsAfterSummon;
      }

      return {
        myUpdatedCards,
        opponentUpdatedCards,
        modifiedDamage: updatedDamage,
      };
    },
  },
  //Kaeya's Normal Attack
  "b17045ef-f632-4864-b72d-c0cd048eb4b3": {
    requiredTargets: 1,
    execute: makeNormalAttackExecuteFunction(
      "PHYSICAL",
      2,
      "b17045ef-f632-4864-b72d-c0cd048eb4b3"
    ),
  },
  //Kaeya's Skill
  "124e3616-dc1d-48de-b9c5-2fb05e65a498": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      let baseDamage = 3;
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCardID,
          targetCards,
          effect,
          baseDamage,
          damageElement: "CRYO",
          attackBaseEffectID: "124e3616-dc1d-48de-b9c5-2fb05e65a498",
          currentRound,
        });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
        modifiedDamage: updatedDamage,
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
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          effect,
          opponentDice,
          thisCardID,
          targetCards,
          baseDamage: 1,
          damageElement: "CRYO",
          attackBaseEffectID: "f72c5197-0fea-451c-9756-76885ac144e1",
          currentRound,
        });
      if (!summons) {
        return { errorMessage: "No summons found" };
      }
      const { myUpdatedCards: myUpdatedCardsAfterSummon } = createSummon({
        summonBasicInfoID: "529ec9d6-67ed-430a-acc2-22219f0880ef",
        isCreation: true,
        summons,
        myCards: myUpdatedCards || myCards,
        maxUsages: 3,
      });
      if (myUpdatedCardsAfterSummon) {
        myUpdatedCards = myUpdatedCardsAfterSummon;
      }

      return {
        myUpdatedCards,
        opponentUpdatedCards,
        modifiedDamage: updatedDamage,
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
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      let baseDamage = 3;
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      if ((effect.usages_this_turn || 0) + 1 == 3) {
        baseDamage = 5;
      }
      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCardID,
          targetCards,
          effect,
          baseDamage,
          damageElement: "PYRO",
          attackBaseEffectID: "9b20f340-e91f-4831-b768-7e7ee0ced987",
          currentRound,
        });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
        modifiedDamage: updatedDamage,
      };
    },
  },

  //Diluc's Burst
  "1b5317e6-59db-4e53-bdc5-3e6923433b70": {
    requiredTargets: 1,
    execute: ({
      myCards,
      opponentCards,
      thisCardID,
      targetCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }: ExecuteEffectParams) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      let { myUpdatedCards, opponentUpdatedCards, updatedDamage } =
        executeAttack({
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          thisCardID,
          targetCards,
          baseDamage: 8,
          damageElement: "PYRO",
          attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
          effect,
          currentRound,
        });
      //add status PYRO_INFUSION to Diluc
      myUpdatedCards = (myUpdatedCards || myCards).map((card) => {
        if (card.id === thisCardID) {
          return {
            ...card,
            statuses: [
              ...(card.statuses || []),
              {
                name: "PYRO_INFUSION",
                turnsLeft: 2,
              },
            ],
          };
        } else {
          return card;
        }
      });

      return {
        myUpdatedCards,
        opponentUpdatedCards,
        modifiedDamage: updatedDamage,
      };
    },
  },

  //---------------SUMMONS----------------
  //Large Wind Spirit - End Phase Effect
  "0f9f109f-3310-46df-a18a-3a659181c23e": {
    triggerOn: ["END_PHASE"],
    execute: ({
      thisCardID,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      effect,
      currentRound,
    }) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
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
        thisCardID,
        targetCards,
        effect,
        baseDamage: 2,
        damageElement: thisCard.element || "ANEMO",
        attackBaseEffectID: "0f9f109f-3310-46df-a18a-3a659181c23e",
        currentRound,
      });

      if (!myUpdatedCards) {
        return { errorMessage: "No cards found" };
      }
      if (thisCard.max_usages !== undefined && thisCard.max_usages !== null) {
        //TODO: should this be max_usages-1?
        if (thisCard.usages === thisCard.max_usages) {
          //removing the summon
          myUpdatedCards = myUpdatedCards.filter(
            (card) => card.id !== thisCard.id
          );
        } else {
          myUpdatedCards = myUpdatedCards.map((card) => {
            if (card.id === thisCard.id) {
              return { ...card, usages: (card.usages || 0) + 1 };
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
  //Large Wind Spirit - On Reaction Effect
  "d10fc5e1-231c-41f2-8a27-594e4777c795": {
    triggerOn: ["REACTION"],
    execute: ({ myCards, thisCardID, triggerContext }) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
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
        reaction.names.includes("SWIRL")
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
      thisCardID,
      myCards,
      opponentCards,
      myDice,
      opponentDice,
      triggerContext,
      currentRound,
    }) => {
      const thisCard = myCards.find((card) => card.id === thisCardID);
      if (!thisCardID || !thisCard) {
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
          thisCardID,
          targetCards,
          baseDamage: 2,
          damageElement: "CRYO",
          effect,
          attackBaseEffectID: "bd921199-ac91-4a61-b803-20879d8d5dc7",
          currentRound,
        });

      if (errorMessage) {
        return { errorMessage };
      }
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
  const basicInfoId = effect.effect_basic_info_id!;
  console.log("basicInfoId", basicInfoId, effects, effects[basicInfoId]);
  return effects[basicInfoId];
};
