import { Database as DB } from "@/lib/database.types";
import { CardStatus } from "./utils";

type EffectBase = DB["public"]["Tables"]["effect"]["Row"];
interface EffectT extends EffectBase {
  costJson?: Json;
  cost?: Cost;
  description?: string;
  effect_basic_info_id?: string;
  effectType?: string;
  // TODO:add effect element to db
}
type Card = DB["public"]["Tables"]["card"]["Row"];
interface CardExtended extends Card {
  element: ElementName | null;
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
  defeatedInTurn?: number;
  statuses?: CardStatus[];
  max_usages?: number;
  isCombatAction?: boolean;
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

type DamageElementT = ElementName | "PHYSICAL" | "PIERCING";
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
type DeckCardsBasicInfoT =
  Database["public"]["Tables"]["deck_card_basic_info"]["Row"][];
type DeckWithCardBasicInfoT = Database["public"]["Tables"]["deck"]["Row"] & {
  deck_card_basic_info: DeckCardsBasicInfo;
};
type CardBasicInfoT = Database["public"]["Tables"]["card_basic_info"]["Row"];
type EffectBasicInfoT =
  Database["public"]["Tables"]["effect_basic_info"]["Row"];
type CardBasicInfoWithEffects = CardBasicInfo & {
  effect_basic_info: EffectBasicInfo[];
};
type CardBasicInfoWithQuantityAndEffectsT = CardBasicInfo & {
  quantity: number;
  effect_basic_info: EffectBasicInfo[];
};
type PhaseNameT =
  | "PREPARATION_PHASE"
  | "ROLL_PHASE"
  | "ACTION_PHASE"
  | "END_PHASE";

//TODO: add missing events
type EventTypeT =
  | "THIS_CARD_ACTIVATION"
  | "CARD_ACTIVATION"
  | "ATTACK"
  | "REACTION"
  | "EQUIP_ARTIFACT"
  | "EQUIP_WEAPON"
  | "SWITCH_CHARACTER"
  | "PREPARATION_PHASE"
  | "ROLL_PHASE"
  | "ACTION_PHASE"
  | "END_PHASE";

type EffectLogicT = {
  triggerOn?: TriggerEvents;
  checkIfCanBeExecuted?: CheckIfEffectCanBeExecutedT;
  execute: ExecuteEffect;
  requiredTargets?: number;
};

type ExecuteEffectParamsT = {
  //TODO: move some params to the trigger context
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  effect: Effect;
  thisCardID: string;
  opponentDice: Dice;
  playerID?: string;
  triggerContext?: TriggerContext;
  //the card that is being targeted by the activated card
  targetCards?: CardExt[];
  summons?: CardExt[];
  currentRound: number;
};

type ExecuteEffectT = (params: ExecuteEffectParams) => {
  //return all cards, including the ones that haven't changed
  myUpdatedCards?: CardExt[];
  myUpdatedDice?: Dice;
  opponentUpdatedCards?: CardExt[];
  opponentUpdatedDice?: Dice;
  errorMessage?: string;
  modifiedCost?: Cost;
  modifiedDamage?: number;
  isFastAction?: boolean;
};

type TriggerEventsT = EventType[] | null;
type TriggerContextT = {
  //will be used with cost reduction effects
  eventType: EventType;
  //can be used both for attacks and equips
  targetCards?: CardExt[];
  cost?: Cost;
  activatedCard?: CardExt;
  attack?: {
    attackBaseEffectID?: string;
    attackerCard?: CardExt;
  };
  damage?: number;
  reaction?: {
    name: ElementalReaction;
    resultingElement?: ElementName;
  };
  switched?: {
    from?: CardExt;
    to?: CardExt;
  };
};

type CheckIfEffectCanBeExecutedParamsT = ExecuteEffectParams;
//  {
//   myCards?: CardExt[];
//   opponentCards?: CardExt[];
//   triggerContext?: TriggerContext;
//   effect?: Effect;
//   thisCard?: CardExt;
//   opponentDice?: Dice;
//   playerID?: string;
//   myDice?: Dice;
//   //the card that is being targeted by the activated card
//   targetCards?: CardExt[];
//   //TODO: add more params
// };
type CheckIfEffectCanBeExecutedT = (
  params: CheckIfEffectCanBeExecutedParams
) => { errorMessage?: string };
type AttackT = {
  attackerCardID: string | null;
  targetCardID: string | null;
  attackEffectBaseID: string;
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
  type DeckCardsBasicInfo = DeckCardsBasicInfoT;
  type DeckWithCardBasicInfo = DeckWithCardBasicInfoT;
  type CardBasicInfo = CardBasicInfoT;
  type EffectBasicInfo = EffectBasicInfoT;
  type CardBasicInfoWithEffects = CardBasicInfoWithEffects;
  type CardBasicInfoWithQuantityAndEffects =
    CardBasicInfoWithQuantityAndEffectsT;
  type PhaseName = PhaseNameT;
  type EventType = EventTypeT;
  type TriggerContext = TriggerContextT;
  type CheckIfEffectCanBeExecuted = CheckIfEffectCanBeExecutedT;
  type CheckIfEffectCanBeExecutedParams = CheckIfEffectCanBeExecutedParamsT;
  type ExecuteEffect = ExecuteEffectT;
  type ExecuteEffectParams = ExecuteEffectParamsT;
  type TriggerEvents = TriggerEventsT;
  type EffectLogic = EffectLogicT;
  type Attack = AttackT;
}
