import {
  Session,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { uuid } from "uuidv4";
import { atom, selector, selectorFamily, waitForAll } from "recoil";
import { recoilPersist } from "recoil-persist";
import { RealtimeChannel } from "@supabase/supabase-js";

import { cardFromBasicInfo, PhaseName } from "@/app/utils";
const { persistAtom } = recoilPersist();
// const supabase = createClientComponentClient();
type Profile = Database["public"]["Tables"]["profile"]["Row"];

export const mySessionState = selector<Session | null>({
  key: "mySessionState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const { data, error } = await supabase.auth.getSession();
    if (error) console.log("error", error);
    return data.session;
  },
});
export const usersInLobbyIDsState = atom<string[]>({
  key: "usersInLobbyIDsState",
  default: [],
});

//TODO: set profile data at login
export const myProfileState = selector<Profile | null>({
  key: "myProfileState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const myID = get(myIDState);
    if (!myID) return null;
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", myID)
      .single();
    if (error) console.log("error", error);
    return data;
  },
});
export const myIDState = selector<string>({
  key: "myIDState",
  get: ({ get }) => {
    const mySession = get(mySessionState);
    return mySession?.user.id ?? "";
  },
});

export const opponentIDState = atom<string>({
  key: "opponentIDState",
  default: "",
});

export const opponentProfileState = selector<Profile | null>({
  key: "opponentProfileState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const opponentID = get(opponentIDState);
    if (!opponentID) return null;
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", opponentID)
      .single();
    console.log("error", error);
    console.log("data", data);
    return data;
  },
});
export const myDecksState = selector({
  key: "myDecksState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const myID = get(myIDState);
    console.log("myID", myID);
    if (!myID) return null;
    const { data, error } = await supabase
      .from("deck")
      .select("*")
      .eq("player_id", myID);
    if (error) {
      console.log("error", error);
      return null;
    }
    return data;
  },
});
export const myCurrentDeckIDState = atom<string>({
  key: "currentDeckIDState",
  default: "",
  effects_UNSTABLE: [persistAtom],
});
type DeckCardsBasicInfo =
  Database["public"]["Tables"]["deck_card_basic_info"]["Row"][];
type Deck = Database["public"]["Tables"]["deck"]["Row"] & {
  deck_card_basic_info: DeckCardsBasicInfo;
};
export const myCurrentDeckState = selector<Deck | null>({
  key: "myCurrentDeckState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const myCurrentDeckID = get(myCurrentDeckIDState);
    if (!myCurrentDeckID) return null;
    const { data, error } = await supabase
      .from("deck")
      .select("*, deck_card_basic_info(*)")
      .eq("id", myCurrentDeckID)
      .single();
    if (error) console.log("error", error);
    return data;
  },
});

//gets the basic info of all the cards in the deck along with their quantities in deck
type CardBasicInfo = Database["public"]["Tables"]["card_basic_info"]["Row"];
type EffectbasicInfo = Database["public"]["Tables"]["effect_basic_info"]["Row"];
type CardWithQuantity = CardBasicInfo & {
  quantity: number;
  effect_basic_info: EffectbasicInfo[];
};
export const myCurrentDeckCardsBasicInfoState = selector<
  CardWithQuantity[] | null
>({
  key: "myCurrentDeckCardsBasicInfoState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const myCurrentDeck = get(myCurrentDeckState);
    console.log("myCurrentDeck in atom", myCurrentDeck);
    if (!myCurrentDeck) return null;
    const myCardsBasicInfoIDs = myCurrentDeck.deck_card_basic_info.map(
      ({ card_basic_info_id }) => card_basic_info_id
    );
    console.log("cardsBasicInfoIDs", myCardsBasicInfoIDs);
    const { data, error } = await supabase
      .from("card_basic_info")
      .select("* , effect_basic_info(*)")
      .in("id", myCardsBasicInfoIDs);
    console.log("data", data);
    if (error) console.log("error", error);
    if (!data) return null;
    const cardsBasicInfoWithQuantities = data.map((cardBasicInfo) => ({
      ...cardBasicInfo,
      quantity:
        myCurrentDeck.deck_card_basic_info.find(
          (deckCardInfo) => deckCardInfo.card_basic_info_id === cardBasicInfo.id
        )?.quantity ?? 0,
    }));
    return cardsBasicInfoWithQuantities;
  },
});

//TODO: make this depend on gameState?
export const currentGameIDState = atom<string>({
  key: "currentGameIDState",
  default: "",
});

export const opponentInGameCardsState = atom<CardExt[]>({
  key: "opponentInGameState",
  default: [],
});

// export const myInGameCardsInitialState = selector<CardExt[] | null>({
//   key: "myInGameCardsInitialState",
//   get: async ({ get }) => {
//     // const currentGameID = get(currentGameIDState);
//     const myCurrentDeckCardsBasicInfo = get(myCurrentDeckCardsBasicInfoState);
//     const myID = get(myIDState);
//     if (!myCurrentDeckCardsBasicInfo) return null;
//     let myDeckCardsInGame: CardExt[] = [];
//     console.log("myCurrentDeckCardsBasicInfo", myCurrentDeckCardsBasicInfo);

//     myCurrentDeckCardsBasicInfo.forEach((cardBasicInfo) => {
//       const quantity = cardBasicInfo.quantity || 1;
//       for (let i = 0; i < quantity; i++) {
//         const card = cardFromBasicInfo(cardBasicInfo, myID);
//         myDeckCardsInGame.push(card);
//       }
//     });
//     console.log("myDeckCardsInGame", myDeckCardsInGame);
//     return myDeckCardsInGame;
//   },
// });
export const myInGameCardsState = atom<CardExt[]>({
  key: "myInGameCardsState",
  default: [],
});

export const currentActiveCharacterState = selector<CardExt | null>({
  key: "currentActiveCharacterState",
  get: ({ get }) => {
    const myInGameCards = get(myInGameCardsState);
    if (!myInGameCards) return null;
    return (
      myInGameCards.find(
        (card) => card.is_active && card.card_type === "CHARACTER"
      ) || null
    );
  },
});

export const currentActiveCharacterAttacksState = selector({
  key: "currentActiveCharacterAttacksState",
  get: ({ get }) => {
    const currentActiveCharacter = get(currentActiveCharacterState);
    if (!currentActiveCharacter) return null;
    return currentActiveCharacter.effects;
  },
});

export const opponentCurrentDeckIDState = atom<string>({
  key: "opponentCurrentDeckIDState",
  default: "",
});
export const opponentCurrentDeckState = selector({
  key: "opponentCurrentDeckState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const opponentCurrentDeckID = get(opponentCurrentDeckIDState);
    if (!opponentCurrentDeckID) return null;
    const { data, error } = await supabase
      .from("deck")
      .select("*, card_info:card_basic_info(*)")
      .eq("id", opponentCurrentDeckID)
      .single();
    if (error) console.log("error", error);
    return data;
  },
});
export const currentViewedCardState = atom<CardExt | null>({
  key: "currentViewedCardState",
  default: null,
});
//TODO: use this
export const gameState = atom<Database["public"]["Tables"]["game"]["Row"]>({
  key: "gameState",
  default: {
    created_at: null,
    turn_count: 0,
    id: "",
    player1_id: "",
    player2_id: "",
    winner_id: "",
  },
});

export const myBoardState = atom<Board>({
  key: "MyBoardState",
  default: {
    id: "",
    player_id: "",
    game_id: "",
    available_dice: {},
    cards: [],
  },
});
export const opponentBoardState = atom<Board>({
  key: "OpponentBoardState",
  default: {
    id: "",
    player_id: "",
    game_id: "",
    available_dice: {},
    cards: [],
  },
});

// export const profileState=selectorFamily<Profile, string>({
//   key: "profileState",
//   get: (id) => async ({ get, }) => {

//   }
// })

export const currentRoundState = atom<number>({
  key: "currentRoundState",
  default: 0,
});

export const IDsOfPlayersInGameState = atom<string[]>({
  key: "IDsOfPlayersInGameState",
  default: [],
});

export const isGameStartedState = atom<boolean>({
  key: "hasGameStartedState",
  default: false,
});
export const gameWinnerIDState = atom<string>({
  key: "gameWinnerIDState",
  default: "",
});
export const isGameOverState = selector<boolean>({
  key: "isGameOverState",
  get: ({ get }) => {
    const gameWinnerID = get(gameWinnerIDState);
    return !!gameWinnerID;
  },
});
export const amIPlayer1State = atom<boolean>({
  key: "amIPlayer1State",
});
export const currentPhaseState = atom<PhaseName | null>({
  key: "currentPhaseState",
  default: null,
});
export const amIReadyForNextPhaseState = atom<boolean>({
  key: "amIReadyForNextPhaseState",
  default: false,
});
export const isOpponentReadyForNextPhaseState = atom<boolean>({
  key: "isOpponentReadyForNextPhaseState",
  default: false,
});
export const myDiceState = atom<Dice>({
  key: "myDiceState",
  default: {},
});
export const opponentDiceState = atom<Dice>({
  key: "opponentDiceState",
  default: {},
});
export const currentPlayerIDState = atom<string>({
  key: "currentPlayerIDState",
  default: "",
});

export const nextRoundFirstPlayerIDState = atom<string>({
  key: "nextRoundFirstPlayerIDState",
  default: "",
});
export const isMyTurnState = selector<boolean>({
  key: "isMyTurnState",
  get: ({ get }) => {
    const currentPlayerID = get(currentPlayerIDState);
    const myID = get(myIDState);
    return currentPlayerID === myID;
  },
});

export const amIRerollingState = atom<boolean>({
  key: "amIRerollingState",
  default: false,
});
export const amIRedrawingState = atom<boolean>({
  key: "amIRedrawingState",
  default: false,
});

export const mySelectedCardsState = atom<CardExt[]>({
  key: "mySelectedCardsState",
  default: [],
});

export const selectionPurposeState = atom<"ATTACK" | "EQUIP" | "EFFECT" | null>(
  {
    key: "selectionPurposeState",
    default: null,
  }
);

export const mySelectedDiceState = atom<Dice>({
  key: "mySelectedDiceState",
  default: {},
});
//TODO: remove Card from database?
type Card = Database["public"]["Tables"]["card"]["Row"];

export const opponentCardsState = atom<Card[]>({
  key: "opponentCardsState",
  default: [],
});
export const opponentCardsInHandState = selector<Card[]>({
  key: "opponentCardsInHandState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "HAND");
  },
});
export const opponentCardsInDiscardPileState = selector<Card[]>({
  key: "opponentCardsInDiscardPileState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "DISCARDED");
  },
});
export const opponentCardsInDeckState = selector<Card[]>({
  key: "opponentCardsInDeckState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "DECK");
  },
});

export const summonsState = selector({
  key: "summonsState",
  get: async ({}) => {
    const supabase = createClientComponentClient<Database>();
    //fetch all summons with their effects
    const { data, error } = await supabase
      .from("card_basic_info")
      .select("*, effect_basic_info(*)")
      .eq("card_type", "SUMMON");
    if (error) console.log("error", error);
    const summons = data?.map((cardBasicInfo) =>
      cardFromBasicInfo(cardBasicInfo)
    );
    return summons;
  },
});
