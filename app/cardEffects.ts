import { addDice, discardCard, drawCards } from "./actions";

export type EventType = "ACTIVATION" | "ATTACK" | "REACTION";

type Params = {
  playerID: string;
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  opponentDice: Dice;
  cardToEquipTo?: CardExt;
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
};

export type OnEvent = EventType | EventType[] | null;
type Execution = {
  //TODO: is there a better way to do this?
  requiredTargets?: number;
  //null would mean that the effect is activated immediately
  onEvent?: OnEvent;
  //TODO: use a canBeActivated function instead?
  effect: ExecuteEffect;
};

//only handles the execution, not the effect cost
export const effects: { [key: string]: Execution } = {
  //Chang the Ninth
  //TODO: when and how should this be executed?
  // "7c59cd7c-68d5-4428-99cb-c245f7522b0c": {
  //   //???????
  //   onEvent: "REACTION",
  //   effect: ({ myCards, opponentCards }) => {
  //     return { ...myCards };
  //   },
  // },

  //The Bestest Travel Companion!
  "c4ba57f8-fd10-4d3c-9766-3b9b610de812": {
    effect: ({ thisCard, myCards, myDice }) => {
      if (!thisCard) {
        console.log("No card passed to effect");
        return {};
      }
      //calculating the total cost of the activated card because it might change during the game
      let cardCostTotal = 0;
      const cost = thisCard.cost;
      if (!cost) {
        console.log("No cost found for card");
        return {};
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
    effect: ({ myCards, opponentCards }) => {
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
    effect: ({ targetCards, myCards, opponentCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        console.log("No target card found");
        return {};
      }
      if (target.location !== "SUMMON") {
        console.log("Target card is not a summon card");
        return {};
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
    effect: ({ targetCards, myCards }) => {
      const target = targetCards?.[0];
      if (!target) {
        console.log("No target card found");
        return {};
      }
      if (target.location !== "SUMMON") {
        console.log("Target card is not a summon card");
        return {};
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
    effect: ({ targetCards, myCards }) => {
      if (!targetCards || targetCards.length < 2) {
        console.log("Two target cards are required");
        return {};
      }
      const [shiftFromTarget, shiftToTarget] = targetCards;
      if (!shiftFromTarget || !shiftToTarget) {
        console.log("No target card found");
        return {};
      }
      if (
        shiftFromTarget.location !== "CHARACTER" ||
        shiftToTarget.location !== "CHARACTER"
      ) {
        console.log("Target card is not a character card");
        return {};
      }
      if (
        !shiftFromTarget.equippedCards?.find(
          (c) => c.subtype === "EQUIPMENT_ARTIFACT"
        )
      ) {
        console.log("No artifact found on the first target card");
        return {};
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
            console.log("No artifact found on the first target card");
            return {};
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
    effect: ({ targetCards, myCards }) => {
      if (!targetCards || targetCards.length < 2) {
        console.log("Two target cards are required");
        return {};
      }
      const [shiftFromTarget, shiftToTarget] = targetCards;
      if (!shiftFromTarget || !shiftToTarget) {
        console.log("No target card found");
        return {};
      }
      if (
        shiftFromTarget.location !== "CHARACTER" ||
        shiftToTarget.location !== "CHARACTER"
      ) {
        console.log("Target card is not a character card");
        return {};
      }
      if (
        !shiftFromTarget.equippedCards?.find(
          (c) => c.subtype === "EQUIPMENT_WEAPON"
        )
      ) {
        console.log("No weapon found on the first target card");
        return {};
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
            console.log("No weapon found on the first target card");
            return {};
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
    // onEvent: "ATTACK",
    effect: ({ myCards }) => {
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
    effect: ({ myCards }) => {
      const myUpdatedCards = drawCards(myCards, 2);
      return { myUpdatedCards };
    },
  },
  //Mask of Solitude Basalt
  //TODO: make copies for other elements
  "85247510-9f6b-4d6e-8da0-55264aba3c8b": {
    //TODO: set onEvent to "ACTIVATION" and "ATTACK" (?)

    effect: ({ cardToEquipTo, myCards }) => {
      const myUpdatedCards = myCards.map((card) => {
        //reducing the attack cost of the character card this card is equipped to
        if (card.id === cardToEquipTo?.id) {
          return {
            ...card,
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
        // else if (){

        // }
        else {
          return card;
        }
      });
      return { myUpdatedCards };
    },
  },
};
export default effects;
