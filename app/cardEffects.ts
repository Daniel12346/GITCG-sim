import { addDice, discardCard, drawCards } from "./actions";

export type EventType = "ACTIVATION" | "ATTACK" | "REACTION";

type Params = {
  playerID: string;
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  opponentDice: Dice;
  effect?: Effect;
  thisCard?: CardExt;
  //the card that is being targeted by the activated card
  targetCards?: CardExt[];
};
//TODO: update only cards that have changed
//type myUpdatedCards = {[id: string]: CardExt}

export type ExecuteEffect = (params: Params) => {
  //return all cards, including the ones that haven't changed
  myUpdatedCards?: CardExt[];
  myUpdatedDice?: Dice;
  opponentUpdatedCards?: CardExt[];
  opponentUpdatedDice?: Dice;
  errorMessage?: string;
};

export type Trigger = EventType | EventType[] | null;
type Execution = {
  //TODO: is there a better way to do this?
  requiredTargets?: number;
  //null would mean that the effect is activated immediately
  trigger?: Trigger;
  //TODO: use a canBeActivated function instead?
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
              location: "DISCARD",
              //TODO: make a function for resetting cards
              effects: [],
              counters: 0,
            };
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

  //Blessing of the Divine Relic's Installation
  "ce166d08-1be9-4937-a601-b34835c97dd2": {
    //the effect targets character cards, the artifact does not need to be targeted because a character can only have one artifact at a time
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
      if (
        !shiftFromTarget.equippedCards?.find(
          (c) => c.subtype === "EQUIPMENT_ARTIFACT"
        )
      ) {
        return { errorMessage: "No artifact found on the first target card" };
      }
      let artifactToShift: CardExt | null = null;
      let shiftFromTargetIndex = -1;
      let shiftToTargetIndex = -1;
      const myUpdatedCards = [...myCards];
      myUpdatedCards.forEach((card, index) => {
        if (card.id === shiftFromTarget?.id) {
          artifactToShift =
            card.equippedCards?.find(
              (c) => c.subtype === "EQUIPMENT_ARTIFACT"
            ) ?? null;
          if (!artifactToShift) {
            return {
              errorMessage: "No artifact found on the first target card",
            };
          }
          shiftFromTargetIndex = index;
        }
        if (card.id === shiftToTarget?.id) {
          shiftToTargetIndex = index;
        }
        myUpdatedCards[shiftFromTargetIndex] = {
          ...myUpdatedCards[shiftFromTargetIndex],
          equippedCards: myUpdatedCards[
            shiftFromTargetIndex
          ].equippedCards?.filter((c) => c.id !== artifactToShift?.id),
        };
        myUpdatedCards[shiftToTargetIndex] = {
          ...myUpdatedCards[shiftToTargetIndex],
          equippedCards: [
            ...(myUpdatedCards[shiftToTargetIndex].equippedCards ?? []),
            artifactToShift!,
          ],
        };
      });

      return { myUpdatedCards };
    },
  },

  //Master of Weaponry
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
      if (
        !shiftFromTarget.equippedCards?.find(
          (c) => c.subtype === "EQUIPMENT_WEAPON"
        )
      ) {
        return { errorMessage: "No weapon found on the first target card" };
      }
      let weaponToShift: CardExt | null = null;
      let shiftFromTargetIndex = -1;
      let shiftToTargetIndex = -1;
      const myUpdatedCards = [...myCards];
      myUpdatedCards.forEach((card, index) => {
        if (card.id === shiftFromTarget?.id) {
          weaponToShift =
            card.equippedCards?.find(
              (c) => c.subtype === "EQUIPMENT_WEAPON  "
            ) ?? null;
          if (!weaponToShift) {
            return { errorMessage: "No weapon found on the first target card" };
          }
          shiftFromTargetIndex = index;
        }
        if (card.id === shiftToTarget?.id) {
          shiftToTargetIndex = index;
        }
        myUpdatedCards[shiftFromTargetIndex] = {
          ...myUpdatedCards[shiftFromTargetIndex],
          equippedCards: myUpdatedCards[
            shiftFromTargetIndex
          ].equippedCards?.filter((c) => c.id !== weaponToShift?.id),
        };
        myUpdatedCards[shiftToTargetIndex] = {
          ...myUpdatedCards[shiftToTargetIndex],
          equippedCards: [
            ...(myUpdatedCards[shiftToTargetIndex].equippedCards ?? []),
            weaponToShift!,
          ],
        };
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
  //Mask of Solitude Basalt
  //TODO: make copies for other elements
  "85247510-9f6b-4d6e-8da0-55264aba3c8b": {
    //TODO: set trigger to "ACTIVATION" and "ATTACK" (?)
    requiredTargets: 1,
    execute: ({ myCards, targetCards, effect }) => {
      const cardToEquipTo = targetCards?.[0];
      if (!cardToEquipTo) {
        return { errorMessage: "No card to equip to found" };
      }
      if (cardToEquipTo.health && cardToEquipTo.health <= 0) {
        return { errorMessage: "Character has no health left" };
      }
      const myUpdatedCards = myCards.map((card) => {
        //reducing the attack cost of the character card this card is equipped to
        console.log(cardToEquipTo, effect?.card_id);

        if (card.id === cardToEquipTo?.id) {
          return {
            ...card,
            //TODO: equip this card, not effect
            equippedCardIDs: [...card.equippedCards!, effect!],
            effects: card.effects.map((effect) => {
              if (effect.cost && effect.cost["GEO"]) {
                return {
                  ...effect,
                  cost: {
                    ...effect.cost,
                    GEO: effect.cost["GEO"] - 1,
                  },
                };
              } else {
                return effect;
              }
            }),
          };
        }
        //TODO: reduce the cost of talent cards of the character that this card is equipped to

        // else if (card)
        else if (card.id === effect?.card_id) {
          return {
            ...card,
            equipped_to_id: cardToEquipTo.id,
          };
        } else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },
  //--------------ATTACKS------------------
  "b4a1b3f5-45a1-4db8-8d07-a21cb5e5be11": {
    requiredTargets: 1,
    execute: ({ opponentCards, thisCard, targetCards }) => {
      if (!thisCard) {
        return { errorMessage: "No card passed to effect" };
      }
      if (!targetCards || targetCards.length < 1) {
        return { errorMessage: "One target card is required" };
      }
      const opponentUpdatedCards = opponentCards.map((card) => {
        if (card.id === targetCards[0].id) {
          return {
            ...card,
            health: card.health ? card.health - 1 : 0,
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
