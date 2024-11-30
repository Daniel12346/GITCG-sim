"use client";

import { currentGameIDState, currentViewedCardState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import DiceDisplay from "./DiceDisplay";
import { calculateTotalDice } from "@/app/utils";
import RequiredEnergyDisplay from "./RequiredEnergyDisplay";

export default () => {
  const currentCard = useRecoilValue(currentViewedCardState);
  const currentGameID = useRecoilValue(currentGameIDState);
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
        {/* statuses are only displayed in game */}
        {currentGameID && currentCard?.statuses?.length !== 0 && (
          <div className="flex flex-col gap-1">
            <span>STATUSES</span>
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
                if (a.effectType === "NORMAL_ATTACK") return 0;
                if (a.effectType === "ELEMENTAL_SKILL") return 1;
                if (a.effectType === "ELEMENTAL_BURST") return 2;
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
                              <div className="px-4">
                                <RequiredEnergyDisplay
                                  energy={currentCard.max_energy}
                                  energySize={4}
                                />
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
};
