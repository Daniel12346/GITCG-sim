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
  return (
    <>
      <div
        className={`group bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4 border-orange-300 rounded-md
        ${
          amSelectingTargets &&
          selectedTargets.find((target) => target.id === card.id) &&
          "border-4 border-green-500 border-solid"
        }`}
        onClick={handleClick}
        //TODO: remove
        onMouseEnter={() => console.log(card)}
      >
        <>
          {/* //TODO: use Next.js Image component */}
          <img
            src={!isFaceDown ? card.img_src : "../card_back_origin.webp"}
            className={`w-full absolute h-full object-cover object-center`}
          />
          <div className="relative hidden group-hover:flex top-[50%] left-[90%] bg-blue-300 bg-opacity-90 p-1 w-44 z-10  flex-col">
            <span className="font-bold mb-2">{card.name}</span>

            {card &&
              card.effects &&
              card.effects.map((effect) => {
                return (
                  <div className="mb-3">
                    <p className="w-full">{effect.description}</p>
                    <div className="flex gap-1">
                      {effect.cost &&
                        Object.entries(effect.cost)
                          .sort()
                          .map(([element, amount]) => (
                            //TODO: color according to element
                            <span key={card.id + element + amount.toString()}>
                              {element}:{amount}
                            </span>
                          ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </>

        {/* //TODO: display equipped cards */}
      </div>
    </>
  );
}
