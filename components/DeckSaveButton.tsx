import {
  deckInDeckBuilderCardCountState,
  deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState,
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
text-slate-50  hover:bg-green-700 ml-4 bg-green-800 px-1 cursor-pointer rounded-sm text-center
        ${
          isLoading &&
          "opacity-50 pointer-events-none bg-gray-200 text-gray-800 cursor-not-allowed"
        }
      ${
        deckCardBasicInfoTotalCards !== 33 &&
        "opacity-60  bg-red-900 pointer-events-none cursor-not-allowed"
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
          refreshMyDecks();
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
