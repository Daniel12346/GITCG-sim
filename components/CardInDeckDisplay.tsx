import { addCardBasicInfoToDeck, removeBasicInfoFromDeck } from "@/app/utils";
import {
  currentViewedCardState,
  myCurrentDeckIDState,
  mySelectedCardsState,
  myCurrentDeckState,
  myCurrentDeckCardCountState,
} from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";

interface Props {
  card: CardExt;
  isInDeck?: boolean;
}
export default function CardInDeckDisplay({ card, isInDeck }: Props) {
  const setCurrentViewedCard = useSetRecoilState(currentViewedCardState);
  const currentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const currentDeckCardCount = useRecoilValue(myCurrentDeckCardCountState);
  const refreshDeck = useRecoilRefresher_UNSTABLE(myCurrentDeckState);

  const isDeckFull = currentDeckCardCount >= 33;

  return (
    <div
      className={`group bg-blue-200 flex flex-col items-center relative h-24 w-16 border-4
         border-orange-300 
   
      ${card.card_type === "CHARACTER" && isInDeck && "scale-125 mx-2"}`}
      onMouseEnter={() => {
        setCurrentViewedCard(card);
      }}
    >
      <div
        className={`absolute top-0 left-0 w-full h-full z-10 bg-blue-200 opacity-0
   
          `}
      ></div>

      <div className="z-10 flex justify-between w-full">
        <span className="bg-orange-300 rounded-sm text-orange-800 -ml-1 ">
          {card.base_health}
        </span>
      </div>
      {/* energy */}
      <div className="z-10 absolute h-full w-2 top-0 right-0">
        {card.energy !== null && (
          <div className="flex flex-col rounded-sm gap-2 items-center text-orange-300 -mr-1">
            {card.max_energy &&
              Array.from({ length: card.max_energy }).map((_, i) => {
                const isEnergyUsed = i < card.energy!;
                return (
                  <div className="flex flex-col gap-1 justify-center">
                    <span
                      className={`${
                        isEnergyUsed
                          ? "bg-amber-300"
                          : "bg-slate-100 opacity-90"
                      }  w-2  h-2  outline-orange-600 outline-double outline-2
                    rounded-full
                    `}
                    ></span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* statuses */}
      <div className="bg-orange-100 rounded-sm text-blue-800">
        {card.statuses?.map((status) => (
          //TODO: use unique key
          <span>
            {status.name}: {status.turnsLeft}
          </span>
        ))}
      </div>
      <div className="z-10 flex justify-center w-full bottom-[-10px] absolute ">
        {(isInDeck ? card.card_type !== "CHARACTER" : true) && (
          <span
            className={`bg-slate-200 px-0.5 text-blue-800 h-fit font-extrabold cursor-pointer
              ${
                (isDeckFull || card.quantity === 4) &&
                "opacity-50 pointer-events-none"
              }
              `}
            onClick={async () => {
              await addCardBasicInfoToDeck(
                client,
                card.card_basic_info_id,
                currentDeckID
              );
              refreshDeck();
            }}
          >
            +
          </span>
        )}
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

      {/* //TODO: use Next.js Image component */}
      <img
        src={card.img_src}
        className={`w-full absolute h-full object-cover object-center rounded-md`}
      />
    </div>
  );
}
