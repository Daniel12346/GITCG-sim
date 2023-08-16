import { myInGameCardsState, opponentInGameCardsState } from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";

interface Props {
  card: Card;
}
const Card = ({ card }: Props) => {
  return (
    <div className="bg-blue-200 flex flex-col items-center w-28">
      <span className="h-16">{card.name}</span>
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

export default function GameBoard() {
  const myCards = useRecoilValue(myInGameCardsState);
  const opponentCards = useRecoilValue(opponentInGameCardsState);
  return (
    <div className="flex bg-orange-400 flex-row flex-wrap gap-4">
      {myCards?.map((card) => {
        return <Card key={card.id} card={card} />;
      })}
    </div>
  );
}
