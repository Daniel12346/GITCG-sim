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
  costJson?: Json;
  cost?: Cost;
  description?: string;
  effect_basic_info_id?: string;
  effectType?: string;
}
type Card = DB["public"]["Tables"]["card"]["Row"];
interface CardExtended extends Card {
  effects: EffectT[];
  shield?: number;
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

type EventTypeT =
  | "THIS_CARD_ACTIVATION"
  | "CARD_ACTIVATION"
  | "ATTACK"
  | "REACTION"
  | "EQUIP_TALENT"
  | "EQUIP_ARTIFACT"
  | "EQUIP_WEAPON"
  | "SWITCH";

type DamageElementT = "PHYSICAL" | "PIERCING" | Omit<DieElementNameT, "OMNI">;
type ElementalReactionT =
  | "MELT"
  | "VAPORIZE"
  | "OVERLOADED"
  | "SUPERCONDUCT"
  | "ELECTROCHARGED"
  | "SHATTERED"
  | "CRYSTALLIZE"
  | "SWIRL"
  | "BURNING"
  | "FROZEN"
  | "QUICKEN";

type ElementalInfusionT =
  | "CRYO_INFUSION"
  | "PYRO_INFUSION"
  | "ELECTRO_INFUSION"
  | "ANEMO_INFUSION"
  | "DENDRO_INFUSION"
  | "GEO_INFUSION";
type StatusT = ElementName | ElementalReaction | ElementalInfusion;
type CardStatusT = {
  name: Status;
  turnsLeft?: number;
  //for Dendro spores, etc.
  amount?: number;
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
  type EventType = EventTypeT;
  type DamageElement = DamageElementT;
  type ElementalReaction = ElementalReactionT;
  type ElementalInfusion = ElementalInfusionT;
  type Status = StatusT;
  type CardStatus = CardStatusT;
}
