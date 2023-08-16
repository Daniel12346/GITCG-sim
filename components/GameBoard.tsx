import { myInGameCardsState, opponentInGameCardsState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";

interface Props {
  card: Card;
}
const Card = ({ card }: Props) => {
  return (
    <div className="bg-blue-200 flex flex-col items-center w-28">
      <span>{card.name}</span>
      {/* //TODO: use Next.js Image component */}
      <img
        src={card.img_src}
        className="w-full h-12 object-cover object-center"
      />
      <span>{card.card_type}</span>
      <span>{card.faction}</span>
      <span>{card.element}</span>
    </div>
  );
};

//TODO: move to another file
interface PlayerBoardProps {
  playerCards: Card[];
}
const PlayerBoard = ({ playerCards }: PlayerBoardProps) => {
  return (
    <div className="bg-red-400 grid-cols-[5%_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-2 w-screen grid h-[40vh] p-2">
      <div className="bg-yellow-50 h-full">deck zone</div>
      <div className="bg-yellow-50 h-full">
        action zone
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter((card) => card.card_type === "ACTION")
            .map((card) => (
              <Card key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">
        <div>
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => (
              <Card key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div className="bg-yellow-50 h-full">summon zone</div>
    </div>
  );
};

export default function GameBoard() {
  const myCards = useRecoilValue(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  useEffect(() => {
    console.log("myCards", myCards);
    console.log(
      "Char",
      myCards?.filter((card) => card.card_type === "CHARACTER")
    );
  }, [myCards]);
  return (
    <div>
      <PlayerBoard playerCards={myCards || []} />
      <PlayerBoard playerCards={opponentCards || []} />
    </div>
  );
}
