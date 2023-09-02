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
}
export default function Card({ card, handleClick }: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargets, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  return (
    <div
      className={`bg-blue-200 flex flex-col items-center  ${
        // card.card_type === "CHARACTER" ? "h-20" : "h-16"
        "h-18"
      } w-28  ${
        amSelectingTargets &&
        selectedTargets.find((target) => target.id === card.id) &&
        "border-4 border-green-500 border-solid"
      }`}
      onClick={handleClick}
      //TODO: remove
      onMouseEnter={() => console.log(card)}
    >
      <div className="w-full">
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
        src={card.img_src}
        className={`w-full ${
          card.card_type === "CHARACTER" ? "h-20" : "h-12"
        } object-cover object-center`}
      />

      {/* //TODO: display equipped cards */}
    </div>
  );
}
