import {
  Session,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { uuid } from "uuidv4";
import { useEffect } from "react";
import { atom, selector, waitForAll } from "recoil";
import { recoilPersist } from "recoil-persist";
import { RealtimeChannel } from "@supabase/supabase-js";
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
export const myProfileState = atom<Profile | null>({
  key: "myProfileState",
  default: null,
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
});

export const opponentProfileState = selector<Profile | null>({
  key: "opponentProfileState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const opponentID = get(opponentIDState);
    console.log("opponentID", opponentID);
    console.log("supabase", supabase);
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
export const myCurrentDeckState = selector({
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
export const myCurrentDeckCardsBasicInfoState = selector({
  key: "myCurrentDeckCardsBasicInfoState",
  get: async ({ get }) => {
    const supabase = createClientComponentClient<Database>();
    const myCurrentDeck = get(myCurrentDeckState);
    console.log("myCurrentDeck in atom", myCurrentDeck);
    if (!myCurrentDeck) return null;
    //TODO: move this to a selector family (?) that fetches the basic info for each card in the deck
    const myCardsBasicInfoIDs = myCurrentDeck.deck_card_basic_info.map(
      ({ card_basic_info_id }) => card_basic_info_id
    );
    console.log("cardsBasicInfoIDs", myCardsBasicInfoIDs);
    const { data, error } = await supabase
      .from("card_basic_info")
      .select()
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

export const opponentInGameCardsState = atom<Card[]>({
  key: "opponentInGameState",
  default: [],
});

export const myInGameCardsInitialState = selector({
  key: "myInGameCardsInitialState",
  get: async ({ get }) => {
    // const currentGameID = get(currentGameIDState);
    const myCurrentDeckCardsBasicInfo = get(myCurrentDeckCardsBasicInfoState);
    const myID = get(myIDState);
    if (!myCurrentDeckCardsBasicInfo) return null;
    let myDeckCardsInGame: Card[] = [];
    console.log("myCurrentDeckCardsBasicInfo", myCurrentDeckCardsBasicInfo);
    myCurrentDeckCardsBasicInfo.forEach((cardBasicInfo) => {
      const quantity = cardBasicInfo.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        myDeckCardsInGame.push({
          ...cardBasicInfo,
          //TODO: make cardType either nullalble or non-nullable for both cardBasicInfo and card
          card_type: cardBasicInfo.card_type ?? "",
          counters: 0,
          location: cardBasicInfo.card_type !== "CHARACTER" ? "DECK" : null,
          id: uuid(),
          card_basic_info_id: cardBasicInfo.id,
          energy: 0,
          health: cardBasicInfo.base_health,
          statuses: [],
          usages: 0,
          //refers to whether the card is currently in play (only for character cards?)
          is_active: false,
          owner_id: myID,
          //TODO: use JSON because the card itself is not stored in the database
          equipped_to_id: null,
        });
      }
      // }
    });
    console.log("myDeckCardsInGame", myDeckCardsInGame);
    return myDeckCardsInGame;
  },
});
export const myInGameCardsState = atom({
  key: "myInGameCardsState",
  default: myInGameCardsInitialState,
});
//TODO: generate deck cards from the basic info (only client-side)
// const inGameCardsFromBasicInfo = selector({
//   key: "inGameCardsFromDeckInfo",
//   get: async ({ get }) => {
//     const;
//   },
// });
export const myDeckCardsState = atom({
  key: "myDeckCardsState",
  default: [],
});
export const opponentCurrentDeckIDState = atom<string>({
  key: "opponentCurrentDeckIDState", //TODO: fetch default value?
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

//game-related state --------------------------------
export const gameChannelState = atom<RealtimeChannel | null>({
  key: "gameChannel",
  default: null,
});

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

type Board = {
  id: string;
  player_id: string;
  game_id: string;
  available_dice: JSON[];
  cards: Card[];
};
export const myBoardState = atom<Board>({
  key: "MyBoardState",
  default: {
    id: "",
    player_id: "",
    game_id: "",
    available_dice: [],
    cards: [],
  },
});
export const opponentBoardState = atom<Board>({
  key: "OpponentBoardState",
  default: {
    id: "",
    player_id: "",
    game_id: "",
    available_dice: [],
    cards: [],
  },
});

// export const profileState=selectorFamily<Profile, string>({
//   key: "profileState",
//   get: (id) => async ({ get, }) => {

//   }
// })

export const currentTurnState = atom<number>({
  key: "currentTurnState",
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
export const isGameOverState = atom<boolean>({
  key: "isGameOverState",
  default: false,
});
//TODO: restrict strings to only valid phase names
export const amIPlayer1State = selector<boolean>({
  key: "amIPlayer1State",
  get: ({ get }) => {
    const myProfile = get(myProfileState);
    const game = get(gameState);
    //TODO fix typo in player1I_board_id in db
    return myProfile?.id === game.player1_id;
  },
});
export const currentPhaseState = atom<
  "PREPARATION" | "ROLL" | "ACTION" | "END"
>({
  key: "currentPhaseState",
  default: "PREPARATION",
});
export const amIReadyForNextPhaseState = atom<boolean>({
  key: "amIReadyForNextPhaseState",
  default: false,
});
export const isOpponentReadyForNextPhaseState = atom<boolean>({
  key: "isOpponentReadyForNextPhaseState",
  default: false,
});
export const myDiceState = atom<JSON[]>({
  key: "myDiceState",
});
export const opponentDiceState = atom<JSON[]>({
  key: "opponentDiceState",
});
export const currentPlayerIDState = atom<string>({
  key: "currentPlayerIDState",
  default: "",
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
    return opponentCards.filter((card) => card.location === "DISCARD_PILE");
  },
});
export const opponentCardsInDeckState = selector<Card[]>({
  key: "opponentCardsInDeckState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "DECK");
  },
});

//TODO: selectors for cards in hand, cards in play, etc.???, available attacks
//TODO: add player count to game table
//-----------------------------------------
