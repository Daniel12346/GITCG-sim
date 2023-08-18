"use client";
import { Suspense, useEffect } from "react";
import {
  currentGameIDState,
  opponentIDState,
  opponentProfileState,
  myInGameCardsState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import GameBoard from "@/components/GameBoard";
import { useParams } from "next/navigation";
import GameChannel from "@/components/GameChannel";

export default function Game() {
  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  // const currentGameID = useRecoilValue(currentGameIDState);

  return (
    //TODO: handle loading game page
    <div>
      {/* <GameChannel /> */}
      <GameBoard />
    </div>
  );
}
