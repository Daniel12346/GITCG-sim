import { subtractCost } from "@/app/actions";
import { CardExtended } from "@/app/global";
import {
  myDiceState,
  myInGameCardsState,
  mySelectedCardsState,
  mySelectedDiceState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";
export default function ElementalTuning({}) {
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [selectedCards, setSelectedCards] =
    useRecoilState(mySelectedCardsState);
  const [selectedDice, setSelectedDice] = useRecoilState(mySelectedDiceState);
  const performElementalTuning = () => {
    if (!myCards) return { errorMessage: "No cards" };
    if (!myDice) return { errorMessage: "No dice" };
    //TODO: check the amount of dice
    if (!selectedDice) return { errorMessage: "No die to tune" };
    //TODO: discarding multiple cards
    if (selectedCards.length > 1) return { errorMessage: "Too many cards" };
    const cardToDiscard = selectedCards[0];
    if (cardToDiscard.location !== "HAND") {
      return { errorMessage: "Card not in hand" };
    }
    if (selectedDice["OMNI"]) {
      return { errorMessage: "Cannot use OMNI die" };
    }
    try {
      console.log("TUNING", myDice, selectedDice, cardToDiscard);
      let updatedDice = subtractCost(myDice, selectedDice);
      updatedDice = {
        ...updatedDice,
        OMNI: updatedDice.OMNI ? updatedDice.OMNI + 1 : 1,
      };
      const updatedCards = myCards.map((card) => {
        if (card.id === cardToDiscard.id) {
          return {
            ...card,
            location: "DISCARD",
          };
        }
        return card;
      });
      setMyCards(updatedCards as CardExtended[]);
      setMyDice(updatedDice);
      setSelectedDice({});
      setSelectedCards([]);
    } catch (e) {
      return { errorMessage: "Not enough dice" };
    }
  };
  return (
    <div className="bg-blue-400">
      {/* //TODO: error handling */}
      <button onClick={performElementalTuning}>Tune</button>
    </div>
  );
}
