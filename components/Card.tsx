import { gameChannelState, myIDState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ReactEventHandler, useEffect, useState } from "react";

interface Props {
  card: CardExt;
  handleClick?: ReactEventHandler<HTMLDivElement>;
}
export default function Card({ card, handleClick }: Props) {
  return (
    <div
      className="bg-blue-200 flex flex-col items-center w-28"
      onClick={handleClick}
      onMouseEnter={() => console.log(card.effects)}
    >
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
}
