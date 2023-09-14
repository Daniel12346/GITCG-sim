import {
  amSelectingTargetsState,
  currentViewedCardState,
  mySelectedTargetCardsState,
  requiredTargetsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ReactEventHandler, useEffect, useState } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";

interface Props {
  card: CardExt;
  handleClick?: ReactEventHandler<HTMLDivElement>;
  //TODO: fix
  isFaceDown?: boolean;
  isInDeckDisplay?: boolean;
}
export default function Card({
  card,
  handleClick,
  isFaceDown,
  isInDeckDisplay,
}: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargets, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  return (
    <>
      <div
        className={`group bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 rounded-md transition-transform duration-300 ease-in-out
        ${
          amSelectingTargets &&
          selectedTargets.find((target) => target.id === card.id) &&
          "outline-dashed outline-4 outline-green-700"
        }
        ${card && card.is_active && "scale-125"}
        `}
        onClick={(e) => {
          console.log("clicked card", card);
          handleClick && handleClick(e);
        }}
        onMouseEnter={() => setCurrentViewedCard(card)}
      >
        <div className="z-10 flex justify-between w-full ml-[-1rem] mt-[-0.5rem]">
          <span className="bg-orange-300 rounded-sm text-orange-800">
            {isInDeckDisplay ? card.base_health : card.health}
          </span>
          {/* //TODO: display dice cost and energy */}
          <span className="bg-orange-300 rounded-sm text-orange-800">{}</span>
        </div>
        {isInDeckDisplay && (
          <div className="z-10 flex justify-center w-full bottom-[-10px] absolute ">
            <span className="bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer">
              +
            </span>
            <span className="bg-slate-200 px-0.5 text-red-800 h-fit font-extrabold cursor-pointer">
              -
            </span>
          </div>
        )}
        {/* //TODO: use Next.js Image component */}
        <img
          src={!isFaceDown ? card.img_src : "../card_back_origin.webp"}
          className={`w-full absolute h-full object-cover object-center rounded-md`}
        />

        {/* //TODO: display equipped cards */}
      </div>
    </>
  );
}
