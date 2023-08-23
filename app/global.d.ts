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

type CostElementNameT =
  | "ANEMO"
  | "DENDRO"
  | "PYRO"
  | "HYDRO"
  | "ELECTRO"
  | "CRYO"
  | "GEO"
  | "MATCHING"
  | "UNALIGNED";
type DieElementNameT =
  | "ANEMO"
  | "DENDRO"
  | "PYRO"
  | "HYDRO"
  | "ELECTRO"
  | "CRYO"
  | "GEO"
  | "OMNI";

type DiceT = {
  [key in DieElementName]?: number;
};

type CostT = {
  [key in CostElementName]?: number;
};

declare global {
  type Database = DB;
  //extends Card with effects
  type CardExt = CardExtended;
  type Effect = EffectT;
  type Board = BoardT;
  type CostElementName = CostElementNameT;
  type DieElementName = DieElementNameT;
  type Dice = DiceT;
  type Cost = CostT;
}
