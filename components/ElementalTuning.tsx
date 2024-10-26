import { subtractCost } from "@/app/actions";
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
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
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
  const performElementalTuning = () => {
    if (selectedCards.length === 0)
      return { errorMessage: "No cards selected to discard" };
    if (!myCards) return { errorMessage: "No cards" };
    if (!myDice) return { errorMessage: "No dice" };
    //TODO: check the amount of dice
    if (!selectedDice) return { errorMessage: "No dice to tune" };
    //TODO: discarding multiple cards
    if (selectedCards.length !== calculateTotalDice(selectedDice))
      return { errorMessage: "Number of cards selected does not match dice" };

    if (selectedCards.some((card) => card.location !== "HAND")) {
      return { errorMessage: "Card not in hand" };
    }
    if (selectedDice["OMNI"]) {
      alert("Cannot tune OMNI die");
      return { errorMessage: "Cannot tune OMNI die" };
    }
    try {
      let myUpdatedDice = subtractCost(myDice, selectedDice);
      myUpdatedDice = {
        ...myUpdatedDice,
        OMNI: myUpdatedDice.OMNI
          ? myUpdatedDice.OMNI + selectedCards.length
          : selectedCards.length,
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
      {/* //TODO: error handling */}
      <button
        className="px-1 bg-blue-800 font-semibold text-md text-blue-200 w-fit"
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
