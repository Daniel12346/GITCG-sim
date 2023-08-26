import { Database as DB } from "@/lib/database.types";

type Effect = DB["public"]["Tables"]["effect"]["Row"];
interface EffectT extends Effect {
  // usagesThisTurn: number;
  // totalUsages: number;
  // cardID: string;
  //TODO: add
  execute?: any;
  costJson?: Json;
  cost?: Cost;
}
type Card = DB["public"]["Tables"]["card"]["Row"];
interface CardExtended extends Card {
  effects: EffectT[];
  //TODO: convert cost json to cost object at card creation
  cost?: Cost;
  costJson?: Json;
  subtype?: string;
  equippedCards?: CardExt[] | null;
  equippedTo?: CardExt | null;
  //TODO: remove equipped_to_id from card table
}
type BoardT = {
  id: string;
  player_id: string;
  game_id: string;
  available_dice: Dice;
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
