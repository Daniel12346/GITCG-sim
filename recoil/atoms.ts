import {
  Session,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { atom, selector, selectorFamily } from "recoil";
import { recoilPersist } from "recoil-persist";

import { cardFromBasicInfo, calculateDeckCardCount } from "@/app/utils";
import { CardExtended } from "@/app/global";
import { Tables } from "@/lib/database.types";
const { persistAtom } = recoilPersist();
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

export const userProfileState = selectorFamily<Profile | null, string>({
  key: "userProfileState",
  get:
    (id) =>
    async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("id", id)
        .single();
      if (error) console.log("error", error);
      return data;
    },
});

export const userDecksState = selectorFamily({
  key: "userDecksState",
  get:
    (id: string) =>
    async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("deck")
        .select("*")
        .eq("player_id", id);
      if (error) console.log("error", error);
      return data;
    },
});

export const userCurrentDeckIDState = selectorFamily<string | null, string>({
  key: "userCurrentDeckIDState",
  get:
    (id) =>
    async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("profile")
        .select("current_deck_id")
        .eq("id", id)
        .single();
      if (error) console.log("error", error);
      return data?.current_deck_id ?? null;
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
export const myCurrentDeckCardCountState = selector<number>({
  key: "myCurrentDeckCardCountState",
  get: ({ get }) => {
    const myCurrentDeck = get(
      myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState
    );
    if (!myCurrentDeck) return 0;
    return calculateDeckCardCount(myCurrentDeck);
  },
});

export const myCurrentDeckWithCardBasicInfoState =
  selector<DeckWithCardBasicInfo | null>({
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

export const userCurrentDeckWithCardBasicInfoState = selectorFamily<
  DeckWithCardBasicInfo | null,
  string
>({
  key: "userCurrentDeckWithCardBasicInfoState",
  get:
    (id) =>
    async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const currentDeckID = get(userCurrentDeckIDState(id));
      const { data, error } = await supabase
        .from("deck")
        .select("*, deck_card_basic_info(*)")
        .eq("id", currentDeckID)
        .single();
      if (error) console.log("error", error);
      return data;
    },
});
export const userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState =
  selectorFamily<CardBasicInfoWithQuantityAndEffects[] | null, string>({
    key: "userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState",
    get:
      (id) =>
      async ({ get }) => {
        const supabase = createClientComponentClient<Database>();
        const currentDeck = get(userCurrentDeckWithCardBasicInfoState(id));
        if (!currentDeck) return null;
        const myCardsBasicInfoIDs = currentDeck.deck_card_basic_info.map(
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
        const cardsBasicInfoWithQuantitiesAndEffects = data.map(
          (cardBasicInfo) => ({
            ...cardBasicInfo,
            quantity:
              currentDeck.deck_card_basic_info.find(
                (deckCardInfo) =>
                  deckCardInfo.card_basic_info_id === cardBasicInfo.id
              )?.quantity ?? 0,
          })
        );
        return cardsBasicInfoWithQuantitiesAndEffects;
      },
  });

//gets the basic info of all the cards in the deck along with their quantities in deck
export const myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState =
  selector<CardBasicInfoWithQuantityAndEffects[] | null>({
    key: "myCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState",
    get: async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const myCurrentDeck = get(myCurrentDeckWithCardBasicInfoState);
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
      const cardsBasicInfoWithQuantitiesAndEffects = data.map(
        (cardBasicInfo) => ({
          ...cardBasicInfo,
          quantity:
            myCurrentDeck.deck_card_basic_info.find(
              (deckCardInfo) =>
                deckCardInfo.card_basic_info_id === cardBasicInfo.id
            )?.quantity ?? 0,
        })
      );
      return cardsBasicInfoWithQuantitiesAndEffects;
    },
  });
export const deckInDeckBuilderIDState = atom<string>({
  key: "deckInDeckBuilderIDState",
  default: "",
});

export const deckInDeckBuilderWithCardBasicInfoState =
  selector<DeckWithCardBasicInfo | null>({
    key: "deckInDeckBuilderWithCardBasicInfo",
    get: async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const deckID = get(deckInDeckBuilderIDState);
      if (!deckID) return null;
      const { data, error } = await supabase
        .from("deck")
        .select("*, deck_card_basic_info(*)")
        .eq("id", deckID)
        .single();
      if (error) console.log("error", error);
      return data;
    },
  });
//this state can be changed in the deck builder
export const deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState =
  atom<CardBasicInfoWithQuantityAndEffects[]>({
    key: "deckInDeckBuilderCardBasicInfoWithQuantitiesStateAndEffects",
    default: [],
  });
export const deckInDeckBuilderCardsState = selector<CardExtended[] | null>({
  key: "deckInDeckBuilderCardsState",
  get: ({ get }) => {
    const deckInDeckBuilderCardsBasicInfoWithQuantities = get(
      deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
    );
    if (!deckInDeckBuilderCardsBasicInfoWithQuantities) return null;
    return deckInDeckBuilderCardsBasicInfoWithQuantities.map((cardBasicInfo) =>
      cardFromBasicInfo(cardBasicInfo)
    );
  },
});
export const deckInDeckBuilderCardCountState = selector<number>({
  key: "deckInDeckBuilderCardCountState",
  get: ({ get }) => {
    const deckInDeckBuilder = get(
      deckInDeckBuilderCardsBasicInfoWithQuantitiesAndEffectsState
    );
    if (!deckInDeckBuilder) return 0;
    return calculateDeckCardCount(deckInDeckBuilder);
  },
});

export const deckInDeckBuilderNameState = atom<string>({
  key: "deckInDeckBuilderNameState",
  default: "",
});

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
export const currentHighlightedCardState = atom<CardExt | null>({
  key: "currentHighlightedCardState",
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
export const amIGameWinnerState = selector<boolean>({
  key: "amIGameWinnerState",
  get: ({ get }) => {
    const gameWinnerID = get(gameWinnerIDState);
    const myID = get(myIDState);
    return gameWinnerID === myID;
  },
});
export const isGameOverState = selector<boolean>({
  key: "isGameOverState",
  get: ({ get }) => {
    const gameWinnerID = get(gameWinnerIDState);
    return !!gameWinnerID;
  },
});
export const gameOverMessageState = atom<string>({
  key: "gameOverMessageState",
  default: "",
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
    //TODO: only use in action phase
    const myID = get(myIDState);
    return currentPlayerID === myID;
  },
});
export const isActionPhaseState = selector<boolean>({
  key: "isActionPhaseState",
  get: ({ get }) => {
    const currentPhase = get(currentPhaseState);
    return currentPhase === "ACTION_PHASE";
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

export const opponentCardsState = atom<CardExt[]>({
  key: "opponentCardsState",
  default: [],
});
export const opponentCardsInHandState = selector<CardExt[]>({
  key: "opponentCardsInHandState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "HAND");
  },
});
export const opponentCardsInDiscardPileState = selector<CardExt[]>({
  key: "opponentCardsInDiscardPileState",
  get: ({ get }) => {
    const opponentCards = get(opponentCardsState);
    return opponentCards.filter((card) => card.location === "DISCARDED");
  },
});
export const opponentCardsInDeckState = selector<CardExt[]>({
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

export const errorMessageState = atom<string>({
  key: "errorMessageState",
  default: "",
});

export const usedAttackState = atom<Attack | null>({
  key: "usedAttackState",
  default: null,
});

type BattleLog = Tables<"game"> & {
  player1: Tables<"profile">;
  player2: Tables<"profile">;
};

export const playerBattleLogsState = selectorFamily({
  key: "playerBattleData",
  get:
    (playerID: string) =>
    async ({ get }) => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from("game")
        .select("*, player1:player1_id(*), player2:player2_id(*)")
        .order("created_at", { ascending: false })
        .or(`player1_id.eq.${playerID},player2_id.eq.${playerID}`);
      if (error) {
        console.log("error", error);
        return null;
      }
      ///@ts-ignore
      return data as BattleLog[];
    },
});

export const playerBattleStatsState = selectorFamily({
  key: "playerBattleStatsState",
  get:
    (playerID: string) =>
    async ({ get }) => {
      const data = get(playerBattleLogsState(playerID));
      if (!data) return null;
      const wins = data.filter((game) => game.winner_id === playerID).length;
      const losses = data.length - wins;
      return { wins, losses, total: data.length };
    },
});

export const userAvatarState = selectorFamily({
  key: "userAvatarState",
  get:
    (id: string | undefined) =>
    async ({ get }) => {
      if (!id) return null;
      try {
        const supabase = createClientComponentClient<Database>();
        const { data, error } = await supabase.storage
          .from("avatars")
          .createSignedUrl(`${id}/avatar.png`, 600);
        if (error) {
          console.log("error", error);
          return null;
        }
        return data?.signedUrl;
      } catch (e) {
        console.log("error", e);
        return null;
      }
    },
});

export const myAvatarState = selector({
  key: "myAvatarState",
  get: async ({ get }) => {
    const myID = get(myIDState);
    const avatar = get(userAvatarState(myID));
    return avatar;
  },
});

export const userBannerState = selectorFamily({
  key: "userBannerState",
  get:
    (id: string | undefined) =>
    async ({ get }) => {
      if (!id) return null;
      try {
        const supabase = createClientComponentClient<Database>();
        const { data, error } = await supabase.storage
          .from("banners")
          .createSignedUrl(`${id}/banner.png`, 600);
        if (error) {
          console.log("error", error);
          return null;
        }
        return data?.signedUrl;
      } catch (e) {
        console.log("error", e);
        return null;
      }
    },
});

export const myBannerState = selector({
  key: "myBannerState",
  get: async ({ get }) => {
    const myID = get(myIDState);
    const banner = get(userBannerState(myID));
    return banner;
  },
});

export const doIHaveAnActiveCharacterState = selector({
  key: "doIHaveAnActiveCharacterState",
  get: ({ get }) => {
    const myInGameCards = get(myInGameCardsState);
    return myInGameCards.some(
      (card) => card.is_active && card.card_type === "CHARACTER"
    );
  },
});

export const doesOpponentHaveAnActiveCharacterState = selector({
  key: "doesOpponentHaveAnActiveCharacterState",
  get: ({ get }) => {
    const opponentInGameCards = get(opponentInGameCardsState);
    return opponentInGameCards.some(
      (card) => card.is_active && card.card_type === "CHARACTER"
    );
  },
});

export const myCurrentActiveCharacterEnergyState = selector({
  key: "myCurrentActiveCharacterEnergyState",
  get: ({ get }) => {
    const myActiveCharacter = get(currentActiveCharacterState);
    if (!myActiveCharacter) return 0;
    return myActiveCharacter.energy;
  },
});

export const opponentCharacterChangesAfterAttackState = atom<
  CardStatChange[] | null
>({
  key: "opponentCharacterChangesAfterAttackState",
  default: null,
});
