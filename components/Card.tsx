import {
  amSelectingTargetsState,
  mySelectedTargetCardsState,
  requiredTargetsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ReactEventHandler, useEffect, useState } from "react";
import { useRecoilState } from "recoil";

interface Props {
  card: CardExt;
  handleClick?: ReactEventHandler<HTMLDivElement>;
  //TODO: fix
  isFaceDown?: boolean;
}
export default function Card({ card, handleClick, isFaceDown }: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargets, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  const [isHover, setHover] = useState(false);
  return (
    <>
      <div
        className={`bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4 border-orange-300 rounded-md
        ${
          amSelectingTargets &&
          selectedTargets.find((target) => target.id === card.id) &&
          "border-4 border-green-500 border-solid"
        }`}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        onClick={handleClick}
        //TODO: remove
        onMouseEnter={() => console.log(card)}
      >
        <>
          <div
            className={`w-full z-10  bg-[hsla(190,50%,50%,0.8)] opacity-0 ${
              isHover && "opacity-100"
            }`}
          >
            <span
              className={` 
      ${card.card_type === "CHARACTER" ? "text-s" : "text-xs"}`}
            >
              {card.name}
            </span>
            {card.card_type === "CHARACTER" && (
              <div className="flex justify-between h-auto w-full">
                <span className="flex justify-start">{card.health}</span>
                <span className="flex justify-end">
                  {card.energy}/{card.max_energy}
                </span>
              </div>
            )}
          </div>
          {/* //TODO: use Next.js Image component */}
          <img
            src={!isFaceDown ? card.img_src : "../card_back_origin.webp"}
            className={`w-full absolute h-full object-cover object-center`}
          />
        </>

        {/* //TODO: display equipped cards */}
        {/* <div className="bg-red-800 absolute bg-transparent">position</div> */}
      </div>
    </>
  );
}
