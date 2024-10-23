import {
  CardBasicInfoWithQuantityAndEffects,
  deckInDeckBuilderCardCountState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
  deckInDeckBuilderIDState,
  deckInDeckBuilderNameState,
  myCurrentDeckIDState,
  myDecksState,
  myIDState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";

export default () => {
  const client = createClientComponentClient<Database>();
  type SaveDeckParams = {
    client: SupabaseClient<Database>;
    deckID: string;
    deckName: string;
    playerID: string;
    deckCardsBasicInfoWithQuantities: CardBasicInfoWithQuantityAndEffects[];
  };
  const deckCardBasicInfoTotalCards = useRecoilValue(
    deckInDeckBuilderCardCountState
  );
  const deckID = useRecoilValue(myCurrentDeckIDState);
  const deckName = useRecoilValue(deckInDeckBuilderNameState);
  const deckCardsBasicInfoWithQuantities = useRecoilValue(
    deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
  );
  const myID = useRecoilValue(myIDState);
  const [isLoading, setIsLoading] = useState(false);
  const refreshMyDecks = useRecoilRefresher_UNSTABLE(myDecksState);
  const updateDeck = async ({
    client,
    deckID,
    deckName,
    deckCardsBasicInfoWithQuantities,
  }: SaveDeckParams) => {
    setIsLoading(true);
    const { error: deckNameUpdateError } = await client
      .from("deck")
      .update({ name: deckName })
      .eq("id", deckID)
      .select("*");
    if (deckNameUpdateError) {
      console.log("Error updating deck name", deckNameUpdateError);
      throw new Error("Error updating deck name");
    }
    const cardIdsWithQuantities = deckCardsBasicInfoWithQuantities.map(
      (cardBasicInfo) => ({
        card_basic_info_id: cardBasicInfo.id,
        quantity: cardBasicInfo.quantity,
        deck_id: deckID,
      })
    );
    //remove all cards from deck
    //TODO: how to delete only the cards that are not in cardIdsWithQuantities
    const { error: deckCardsDeleteError } = await client
      .from("deck_card_basic_info")
      .delete()
      .eq("deck_id", deckID);
    if (deckCardsDeleteError) {
      throw new Error("Error updating deck cards");
    }
    const { error: deckCardsUpdateError } = await client
      .from("deck_card_basic_info")
      .insert(cardIdsWithQuantities)
      .eq("deck_id", deckID);

    if (deckCardsUpdateError) {
      throw new Error("Error updating deck cards");
    }
  };

  return (
    <button
      className={`
bg-green-200 ml-4 text-green-800 px-1 cursor-pointer font-semibold rounded-sm text-center
        ${
          isLoading &&
          "opacity-50 pointer-events-none bg-gray-200 text-gray-800"
        }
      ${
        deckCardBasicInfoTotalCards !== 33 &&
        "opacity-50 bg-red-100 text-red-900"
      }`}
      onClick={async () => {
        setIsLoading(true);
        try {
          await updateDeck({
            client,
            deckID,
            deckName,
            playerID: myID,
            deckCardsBasicInfoWithQuantities,
          });
          //TODO:
          //   refreshMyDecks();
        } catch (e) {
          console.log("error", e);
        } finally {
          setIsLoading(false);
        }
      }}
    >
      save
    </button>
  );
};
