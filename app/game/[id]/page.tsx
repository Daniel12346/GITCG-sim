"use client";
import { Suspense, useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import GameChannel from "@/components/GameChannel";
import CardDisplay from "@/components/CardDisplay";

export default function Game() {
  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  // const currentGameID = useRecoilValue(currentGameIDState);

  return (
    //TODO: handle loading game page
    <div className="w-full p-3">
      <GameChannel />
      {/* //TODO: adapt to mobile */}
      <div className="grid grid-cols-[5fr_1fr] bg-indigo-950">
        <GameBoard />
        <CardDisplay />
      </div>
    </div>
  );
}
