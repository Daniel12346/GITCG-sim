import { Database as DB } from "@/lib/database.types";
import { ExecuteEffect, EventType, Trigger } from "./cardEffects";

type Effect = DB["public"]["Tables"]["effect"]["Row"];
interface EffectT extends Effect {
  // cardID: string;
  //TODO: add
  execute?: ExecuteEffect;
  trigger?: Trigger;
  requiredTargets?: number;
  costJson?: Json;
  cost?: Cost;
  description?: string;
  effect_basic_info_id?: string;
  effectType?: string;
}
type Card = DB["public"]["Tables"]["card"]["Row"];
interface CardExtended extends Card {
  effects: EffectT[];
  cost?: Cost;
  costJson?: Json;
  subtype?: string;
  //IDs of cards equipped to this card
  //TODO: remove?
  // equippedCards?: string[] | null;
  equippedTo?: string | null;
  //should only be used in deck builder
  quantity?: number;
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
