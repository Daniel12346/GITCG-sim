"use client";

import { currentViewedCardState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import DiceDisplay from "./DiceDisplay";
import { calculateTotalDice } from "@/app/utils";

export default () => {
  const currentCard = useRecoilValue(currentViewedCardState);
  return (
    <div className="w-full flex justify-center text-slate-200 relative pt-2">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xl">{currentCard?.name}</span>
        <img src={currentCard?.img_src} className="h-80" />
        {currentCard?.cost && (
          <div className="w-full flex flex-col">
            {/* <span className="w-full">COST:</span> */}
            {calculateTotalDice(currentCard.cost) !== 0 && (
              <div className="w-full flex justify-center">
                <DiceDisplay dice={currentCard?.cost} isMyBoard={false} />
              </div>
            )}
          </div>
        )}
        {currentCard?.statuses?.length !== 0 && (
          <div className="flex flex-col gap-1">
            {currentCard?.statuses?.map((status) => (
              <span
                //TODO: use a unique key
                key={status.name}
              >{`${status.name}  ${status.turnsLeft ?? ""}`}</span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1  max-h-[10rem] overflow-y-scroll translate-x-0">
          {currentCard?.effects &&
            currentCard.effects
              //TODO: fix sorting
              ?.toSorted((a, b) => {
                if (a.effectType === "NORMAL_ATTACK") return -1;
                if (a.effectType === "ELEMENTAL_SKILL") return 0;
                if (a.effectType === "ELEMENTAL_BURST") return 1;
                return 0;
              })
              .map((effect) => {
                return (
                  <div className="w-full p-2" key={effect.id}>
                    {(effect.effectType === "ELEMENTAL_BURST" ||
                      effect.effectType === "ELEMENTAL_SKILL" ||
                      effect.effectType === "NORMAL_ATTACK") && (
                      <span className="text-blue-200/90">
                        {effect.effectType.replace(/_/g, " ")}
                      </span>
                    )}
                    <p className="w-full text-slate-200">
                      {effect.description}
                    </p>
                    <div className="flex gap-[0.5rem]">
                      {effect.cost && calculateTotalDice(effect.cost) !== 0 && (
                        <div>
                          <DiceDisplay
                            dice={Object.fromEntries(
                              Object.entries(effect.cost).filter(
                                ([key]) => key != "ENERGY"
                              )
                            )}
                            isMyBoard={false}
                          />
                          {effect.effectType === "ELEMENTAL_BURST" &&
                            currentCard.max_energy && (
                              <div className="flex items-center px-4">
                                {/* <span>energy:</span> */}
                                <ul className="flex gap-3">
                                  {Array.from({
                                    length: currentCard.max_energy,
                                  }).map((_, i) => (
                                    <img
                                      key={"energy" + i}
                                      src="/energy_icon.svg"
                                      className="w-6 h-6"
                                    />
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
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
