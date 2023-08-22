import { Database as DB } from "@/lib/database.types";

type Effect = DB["public"]["Tables"]["effect_basic_info"]["Row"] & {
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
declare global {
  type Database = DB;
  //extend Card with effectsIDs
  type CardExt = CardExtended;
}
