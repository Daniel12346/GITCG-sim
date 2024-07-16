import { addCardBasicInfoToDeck, removeBasicInfoFromDeck } from "@/app/utils";
import {
  amSelectingTargetsState,
  currentViewedCardState,
  myCurrentDeckCardsBasicInfoState,
  myCurrentDeckIDState,
  mySelectedTargetCardsState,
  requiredTargetsState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ReactEventHandler, useEffect, useState } from "react";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";

interface Props {
  card: CardExt;
  handleClick?: ReactEventHandler<HTMLDivElement>;
  //TODO: fix
  isFaceDown?: boolean;
  isInDeckDisplay?: boolean;
  equippedCards?: CardExt[];
}
export default function Card({
  card,
  handleClick,
  isFaceDown,
  isInDeckDisplay,
  equippedCards,
}: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargets, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  const currentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const refreshDeck = useRecoilRefresher_UNSTABLE(
    myCurrentDeckCardsBasicInfoState
  );

  return (
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
      {
        //only used in deck builder
      }
      {isInDeckDisplay && (
        <div className="z-10 flex justify-center w-full bottom-[-10px] absolute ">
          <span
            className="bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer"
            onClick={async () => {
              await addCardBasicInfoToDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
              //TODO: set new value on cardsBasicInfoState
              refreshDeck();
            }}
          >
            +
          </span>
          <span
            className="bg-slate-200 px-0.5 text-red-800 h-fit font-extrabold cursor-pointer"
            onClick={async () => {
              await removeBasicInfoFromDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
              refreshDeck();
            }}
          >
            -
          </span>
          <span className="bg-slate-200 px-0.5 text-indigo-900 font-semibold">
            {card.quantity}
          </span>
        </div>
      )}
      {/* //TODO: use Next.js Image component */}
      <img
        src={!isFaceDown ? card.img_src : "../card_back_origin.webp"}
        className={`w-full absolute h-full object-cover object-center rounded-md`}
      />
      {equippedCards && equippedCards.length > 0 && (
        <div className="flex gap-1 z-20 absolute">
          {equippedCards.map((equippedCard) => (
            <div className="scale-50">
              <Card key={equippedCard.id} card={equippedCard} />
            </div>
          ))}
        </div>
      )}

      {/* //TODO: display equipped cards */}
    </div>
  );
}
