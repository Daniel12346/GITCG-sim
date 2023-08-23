import { Database as DB } from "@/lib/database.types";

type EffectT = DB["public"]["Tables"]["effect_basic_info"]["Row"] & {
  usagesThisTurn: number;
  totalUsages: number;
  cardID: string;
  //TODO: add
  execute?: any;
};
type Card = DB["public"]["Tables"]["card"]["Row"];
type CardExtended = Card & {
  effects: Effect[];
};
type BoardT = {
  id: string;
  player_id: string;
  game_id: string;
  available_dice: JSON[];
  cards: CardExt[];
};
declare global {
  type Database = DB;
  //extends Card with effects
  type CardExt = CardExtended;
  type Effect = EffectT;
  type Board = BoardT;
}
