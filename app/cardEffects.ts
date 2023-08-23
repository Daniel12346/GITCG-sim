import { drawCards } from "./effectUtils";

type Params = {
  playerID: string;
  myBoardState: Board;
  opponentBoardState: Board;
  card?: CardExt;
  myCards: CardExt[];
};
type ExecuteEffect = (params: Params) => {
  myNewBoardState?: Board;
  opponentNewBoardState?: Board;
};

//only handles the execution, not the effect cost
const effects: { [key: string]: ExecuteEffect } = {
  //Strategize
  "0ecdb8f3-a1a3-4b3c-8ebc-ac0788e200ea": ({ myBoardState }) => {
    const myNewBoardCards = drawCards(myBoardState.cards, 2);
    return {
      myNewBoardState: {
        ...myBoardState,
        cards: myNewBoardCards,
      },
    };
  },
};
export default effects;
