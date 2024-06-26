import { uuid } from "uuidv4";
import effects, { ExecuteEffect, Trigger } from "./cardEffects";
import { SupabaseClient } from "@supabase/supabase-js";

type CardBasicInfo = Database["public"]["Tables"]["card_basic_info"]["Row"];
export const cardFromBasicInfo = (
  cardBasicInfo: CardBasicInfo,
  ownerID?: string
): CardExt => {
  const cardID = uuid();
  return {
    ...cardBasicInfo,
    //TODO: do not ts ignore
    //@ts-ignore
    quantity: cardBasicInfo.quantity || null,
    //TODO: make cardType either nullalble or non-nullable for both cardBasicInfo and card
    card_type: cardBasicInfo.card_type ?? "",
    counters: 0,
    location: cardBasicInfo.card_type === "CHARACTER" ? "CHARACTER" : "DECK",
    id: cardID,
    card_basic_info_id: cardBasicInfo.id,
    energy: 0,
    health: cardBasicInfo.base_health,
    statuses: [],
    usages: 0,
    //refers to whether the card is currently in play (only for character cards)
    is_active: false,
    owner_id: ownerID || "",
    costJson: cardBasicInfo.cost,
    cost: cardBasicInfo.cost as Dice,
    subtype: cardBasicInfo.card_subtype || "",
    equipped_to_id: null,
    equippedTo: null,
    equippedCards: cardBasicInfo.card_type === "CHARACTER" ? [] : null,
    //TODO: fix
    //@ts-ignore
    effects: cardBasicInfo.effect_basic_info.map(
      (effectBasicInfo: any): Effect => {
        let execute: ExecuteEffect | undefined;
        let trigger: Trigger | undefined;
        let requiredTargets: number | undefined;
        const effectLogic = effects[effectBasicInfo.id];
        if (effectLogic) {
          execute = effectLogic.execute;
          trigger = effectLogic.trigger;
          requiredTargets = effectLogic.requiredTargets;
        }

        return {
          ...effectBasicInfo,
          id: uuid(),
          effect_basic_info_id: effectBasicInfo.id,
          card_id: cardID,
          // card_basic_infoId: cardBasicInfo.id,
          total_usages: 0,
          usages_this_turn: 0,
          costJson: effectBasicInfo.cost,
          //TODO: ??????
          effect_basic_infoIdId: effectBasicInfo.id,
          //TODO: generate cost object from cost json
          cost: effectBasicInfo.cost as Dice,
          execute,
          trigger,
          requiredTargets,
          description: effectBasicInfo.description || "",
          effectType: effectBasicInfo.effect_type || "",
        };
      }
    ),
  };
};

export const addCardBasicInfoToDeck = async (
  client: SupabaseClient,
  basicInfoID: string,
  deckID: string
) => {
  const currentQuantityData = await client
    .from("deck_card_basic_info")
    .select("quantity")
    .eq("deck_id", deckID)
    .eq("card_basic_info_id", basicInfoID);
  const currentQuantity = currentQuantityData.data?.[0]?.quantity || 0;
  console.log("currentQuantity", currentQuantity);
  const query = currentQuantity
    ? client
        .from("deck_card_basic_info")
        .update({ quantity: currentQuantity + 1 })
        .eq("deck_id", deckID)
        .eq("card_basic_info_id", basicInfoID)
    : client.from("deck_card_basic_info").insert({
        deck_id: deckID,
        card_basic_info_id: basicInfoID,
        quantity: 1,
      });

  const result = await query;
  console.log(result);
  return result;
};

export const removeBasicInfoFromDeck = async (
  client: SupabaseClient,
  basicInfoID: string,
  deckID: string
) => {
  const currentQuantityData = await client
    .from("deck_card_basic_info")
    .select("quantity")
    .eq("deck_id", deckID)
    .eq("card_basic_info_id", basicInfoID);
  const currentQuantity = currentQuantityData.data?.[0]?.quantity || 0;
  const query = async (client: SupabaseClient) =>
    currentQuantity > 1
      ? client
          .from("deck_card_basic_info")
          .update({ quantity: currentQuantity - 1 })
          .eq("deck_id", deckID)
          .eq("card_basic_info_id", basicInfoID)
      : client
          .from("deck_card_basic_info")
          .delete()
          .eq("deck_id", deckID)
          .eq("card_basic_info_id", basicInfoID);
  const result = await query(client);
  console.log(result);
  result.error && console.log(result.error);
  return result;
};
