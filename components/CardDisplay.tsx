"use client";

import { DiceT } from "@/app/global";
import { currentViewedCardState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default () => {
  const currentCard = useRecoilValue(currentViewedCardState);
  const printCost = (cost: DiceT) =>
    Object.entries(cost)
      .sort()
      .map(([element, amount]) => (
        //TODO: style according to element
        <span key={element}>
          {element}:{amount}
        </span>
      ));

  return (
    <div className="w-full flex justify-center text-slate-200 position-relative">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xl">{currentCard?.name}</span>
        <img src={currentCard?.img_src} className="h-80" />
        <span>{currentCard?.cost && printCost(currentCard.cost)}</span>
        {currentCard?.statuses && (
          <div className="flex flex-col gap-1">
            {currentCard.statuses.map((status) => (
              <span
                //TODO: use a unique key
                key={status.name}
              >{`${status.name}  ${status.turnsLeft ?? ""}`}</span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1 max-h-[10rem] overflow-y-scroll translate-x-0">
          {currentCard?.effects &&
            currentCard.effects.map((effect) => {
              return (
                <div className="w-full p-2" key={effect.id}>
                  <p className="w-full text-slate-200">{effect.description}</p>
                  <div className="flex gap-[0.5rem]">
                    {effect.cost && printCost(effect.cost)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
  // <div className="relative hidden group-hover:flex top-[50%] left-[90%] bg-blue-300 bg-opacity-90 p-1 w-44 z-20  flex-col">
  //   {/* <span className="font-bold mb-2">{card.name}</span>

  //   {card.effects &&
  //     card.effects.map((effect) => {
  //       return (
  //         <div className="mb-3">
  //           <p className="w-full">{effect.description}</p>
  //           <div className="flex gap-1">
  //             {effect.cost &&
  //               Object.entries(effect.cost)
  //                 .sort()
  //                 .map(([element, amount]) => (
  //                   //TODO: color according to element
  //                   <span key={card.id + element + amount.toString()}>
  //                     {element}:{amount}
  //                   </span>
  //                 ))}
  //           </div>
  //         </div>
  //       );
  //     })} */}
  // </div>;
};
