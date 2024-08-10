import { Database as DB } from "@/lib/database.types";
import {
  ExecuteEffect,
  CheckIfEffectCanBeExecuted,
  EventType,
  TriggerEvents,
} from "./cardEffects";
import { CardStatus } from "./utils";

type Effect = DB["public"]["Tables"]["effect"]["Row"];
interface EffectT extends Effect {
  execute?: ExecuteEffect;
  checkIfCanBeExecuted?: CheckIfEffectCanBeExecuted;
  requiredTargets?: number;
  triggerOn?: TriggerEvents;

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
  equippedTo?: string | null;
  //should only be used in deck builder
  quantity?: number;
  //TODO: remove equipped_to_id from card table
  wasActivatedThisTurn?: boolean;
  hasUsedFoodThisTurn?: boolean;
  statuses?: CardStatus[];
}
type BoardT = {
  id: string;
  player_id: string;
  game_id: string;
  available_dice: Dice;
  cards: CardExt[];
};

type ElementNameT =
  | "ANEMO"
  | "DENDRO"
  | "PYRO"
  | "HYDRO"
  | "ELECTRO"
  | "CRYO"
  | "GEO";
type CostElementNameT = ElementName | "MATCHING" | "UNALIGNED";
type DieElementNameT = ElementName | "OMNI";

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
  type ElementName = ElementNameT;
}
