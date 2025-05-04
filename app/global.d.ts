import { Database as DB, Tables } from "@/lib/database.types";
import { CardStatus } from "./utils";

interface EffectT {
  card_id?: string;
  cost?: Json;
  id?: string;
  total_usages?: number;
  usages_this_turn?: number;
  costJson?: Json;
  cost?: Cost;
  description?: string;
  effect_basic_info_id?: string;
  effectType?: string;
}
type LocationT =
  | "DECK"
  | "CHARACTER"
  | "SUMMON"
  | "HAND"
  | "EQUIPPED"
  | "DISCARDED"
  | "ACTION";

interface CardExtended {
  base_health: number | null;
  card_basic_info_id: string;
  card_type: string;
  energy: number | null;
  faction: string | null;
  full_text: string | null;
  health: number | null;
  id: string;
  img_src: string;
  is_active: boolean | null;
  location: CardLocation | null;
  max_energy: number | null;
  name: string;
  owner_id: string;
  usages: number | null;
  weapon_type: string | null;
  element: ElementName | null;
  effects: EffectT[];
  shield?: number;
  cost?: Cost;
  costJson?: Json;
  subtype?: string;
  //id of the card this card is equipped to
  equippedTo?: string | null;
  //should only be used in deck builder
  quantity?: number;
  wasActivatedThisTurn?: boolean;
  hasUsedFoodThisTurn?: boolean;
  defeatedInTurn?: number;
  statuses?: CardStatus[];
  counters?: CardCounter[];
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
type CardCounterT = {
  name: string;
  amount: number;
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

//no prefix is used to respond to events that are triggered by the player
//OPPONENT_  prefix is used to respond to event that are triggered by the opponent
//EITHER_PLAYER_ prefix is to respond to events that can be triggered by either player
type EventTypeT =
  | "THIS_CARD_ACTIVATION"
  | "CARD_ACTIVATION"
  | "ATTACK"
  | "REACTION"
  | "OPPONENT_REACTION"
  | "EITHER_PLAYER_REACTION"
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
  myCards: CardExt[];
  opponentCards: CardExt[];
  myDice: Dice;
  effect: Effect;
  thisCardID: string;
  opponentDice: Dice;
  playerID?: string;
  triggerContext?: TriggerContext;
  //the cards selected as targets for the effect
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
  eventType: EventType;
  //targetCards can be used both for attacks and equipping
  targetCards?: CardExt[];
  cost?: Cost;
  activatedCard?: CardExt;
  attack?: {
    attackBaseEffectID?: string;
    attackerCard?: CardExt;
    damageElement?: DamageElement;
    damageDealt?: number;
  };
  damage?: number;
  reaction?: {
    names: ElementalReaction[];
    resultingElement?: ElementName;
    cause: "ATTACK" | "EFFECT";
  };
  switched?: {
    from?: CardExt;
    to?: CardExt;
  };
};
type CardStatChangeT = {
  cardID: string;
  healthChange: number;
  statusesAdded: CardStatus[] | undefined;
  statusesRemoved: CardStatus[] | undefined;
};
type CheckIfEffectCanBeExecutedParamsT = ExecuteEffectParams;
type CheckIfEffectCanBeExecutedT = (
  params: CheckIfEffectCanBeExecutedParams
) => { errorMessage?: string };
type AttackT = {
  attackerCardID: string | null;
  targetCardID: string | null;
  attackEffectBaseID: string;
};
type BattleLogT = Tables<"game"> & {
  player1: Tables<"profile">;
  player2: Tables<"profile">;
};

declare global {
  type Database = DB;
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
  type CardLocation = CardLocationT;
  type CardStatus = CardStatusT;
  type CardCounter = CardCounterT;
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
  type CardStatChange = CardStatChangeT;
  type BattleLog = BattleLogT;
}
