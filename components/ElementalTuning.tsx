import { subtractCost } from "@/app/gameActions";
import { CardExtended } from "@/app/global";
import { calculateTotalDice } from "@/app/utils";
import {
  errorMessageState,
  myDiceState,
  myInGameCardsState,
  mySelectedCardsState,
  mySelectedDiceState,
} from "@/recoil/atoms";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useRecoilState, useSetRecoilState } from "recoil";
//By discarding cards, the player can tune their elemental dice to match the element of their active character.
export default function ElementalTuning({
  channel,
}: {
  channel: RealtimeChannel | null;
}) {
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [selectedCards, setSelectedCards] =
    useRecoilState(mySelectedCardsState);
  const [selectedDice, setSelectedDice] = useRecoilState(mySelectedDiceState);
  const setErrorMessage = useSetRecoilState(errorMessageState);
  const myActiveCharacter = myCards.find(
    (card) => card.location === "CHARACTER" && card.is_active
  );
  const resultingDiceElement = myActiveCharacter?.element;
  const performElementalTuning = () => {
    if (selectedCards.length === 0)
      return { errorMessage: "No cards selected to discard" };
    if (!myCards) return { errorMessage: "No cards" };
    if (!myDice) return { errorMessage: "No dice" };
    if (!resultingDiceElement) {
      return { errorMessage: "No active character element" };
    }
    if (!selectedDice) return { errorMessage: "No dice to tune" };
    //the number of cards to be discarded must match the number of dice selected
    if (selectedCards.length !== calculateTotalDice(selectedDice))
      return { errorMessage: "Number of cards selected does not match dice" };

    if (selectedCards.some((card) => card.location !== "HAND")) {
      return { errorMessage: "Card not in hand" };
    }

    try {
      let myUpdatedDice = subtractCost(myDice, selectedDice);
      myUpdatedDice = {
        ...myUpdatedDice,
        [resultingDiceElement]:
          selectedCards.length + (myUpdatedDice[resultingDiceElement] || 0),
      };
      const myUpdatedCards = myCards.map((card) => {
        if (selectedCards.find((selectedCard) => selectedCard.id === card.id)) {
          return {
            ...card,
            location: "DISCARD",
          };
        }
        return card;
      });
      channel?.send({
        type: "broadcast",
        event: "updated_cards_and_dice",
        payload: { myCards: myUpdatedCards, myDice: myUpdatedDice },
      });
      setMyCards(myUpdatedCards as CardExtended[]);
      setMyDice(myUpdatedDice);
      setSelectedDice({});
      setSelectedCards([]);
    } catch (e) {
      return { errorMessage: "Not enough dice" };
    }
    return {};
  };
  return (
    <div className="px-3">
      <button
        className="px-1 bg-blue-800 font-semibold text-md text-blue-100 w-fit"
        onClick={() => {
          const { errorMessage } = performElementalTuning();
          errorMessage && setErrorMessage(errorMessage);
        }}
      >
        Tune
      </button>
    </div>
  );
}
