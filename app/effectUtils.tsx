export function drawCards(currentCards: CardExt[], amount: number) {
  const newCardsState = currentCards.map((card) => {
    let location = card.location;
    if (card.location === "DECK" && amount > 0) {
      location = "HAND";
      amount--;
    }
    return { ...card, location };
  });
  return newCardsState;
}

type CostElementName =
  | "ANEMO"
  | "DENDRO"
  | "PYRO"
  | "HYDRO"
  | "ELECTRO"
  | "CRYO"
  | "GEO"
  | "MATCHING"
  | "UNALIGNED";
type DieElementName =
  | "ANEMO"
  | "DENDRO"
  | "PYRO"
  | "HYDRO"
  | "ELECTRO"
  | "CRYO"
  | "GEO"
  | "OMNI";

type Dice = {
  [key in DieElementName]?: number;
};

type Cost = {
  [key in CostElementName]?: number;
};

// const myDice:Dice = {}
// const selectedDice:Dice={"ANEMO":2,"PYRO":1}
// const cost:Cost={"ANEMO":2}

const subtractDice = (dice1: Dice, dice2: Dice) => {
  const result = { ...dice1 };
  Object.keys(dice2).forEach((element) => {
    const elementName = element as DieElementName;
    const requiredAmount = dice2[elementName];
    if (!requiredAmount) return;
    if (result[elementName] === undefined && !result["OMNI"])
      throw new Error("Dice do not containt required element " + elementName);
    for (let i = 0; i < requiredAmount; i++) {
      if (result[elementName]! > 0) {
        result[elementName] = result[elementName]! - 1;
      } else if (result["OMNI"]! > 0) {
        result["OMNI"] = result["OMNI"]! - 1;
      } else {
        throw new Error("Not enough dice");
      }
    }
  });
  return result;
};
// function payEffectCost(
//   cost: DiceOfElement
//   myDice: DiceOfElement,
//   selectedDice: DiceOfElement
// ) {
//   const cost = {...effect}.cost as DiceOfElement;
//   //check if selected dice can pay cost
//   for (const [selectedElement, selectedamount] of Object.entries(selectedDice)) {

//   }
// }
const subtractCost = (dice1: Dice, dice2: Cost) => {
  const result = { ...dice1 };
  //TODO: is the sorting necessary?
  Object.keys(dice2)
    .sort((a, b) => (["MATCHING", "UNALIGNED"].includes(b[0]) ? -1 : 1))
    .forEach((element) => {
      const requiredElementName = element as CostElementName;
      const requiredAmount = dice2[requiredElementName];
      const availableElements = Object.keys(result) as DieElementName[];
      if (!requiredAmount) return;
      if (requiredElementName === "MATCHING") {
        let hasSubtracted = false;
        for (let elName of availableElements) {
          if (!hasSubtracted && result[elName]! >= requiredAmount) {
            result[elName] = result[elName]! - requiredAmount;
            hasSubtracted = true;
          } else {
            //??
            // throw new Error("Not enough dice");
          }
        }
      } else if (requiredElementName === "UNALIGNED") {
        let i = requiredAmount;
        while (i > 0) {
          for (let elName of availableElements) {
            if (i > 0 && result[elName]! > 0) {
              result[elName] = result[elName]! - 1;
              i--;
            }
          }
        }
      } else if (result[requiredElementName] === undefined && !result["OMNI"])
        throw new Error(
          "Dice do not containt required element " + requiredElementName
        );
      else {
        for (let i = 0; i < requiredAmount; i++) {
          if (result[requiredElementName as DieElementName]! > 0) {
            result[requiredElementName as DieElementName] =
              result[requiredElementName as DieElementName]! - 1;
          } else if (result["OMNI"]! > 0) {
            result["OMNI"] = result["OMNI"]! - 1;
          } else {
            throw new Error("Not enough dice");
          }
        }
      }
    });
  return result;
};

console.log(subtractCost({ PYRO: 4, CRYO: 1, OMNI: 2 }, { MATCHING: 2 }));
