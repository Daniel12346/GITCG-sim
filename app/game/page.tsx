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

export default function Game() {
  const opponentID = useRecoilValue(opponentIDState);

  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  // const currentGameID = useRecoilValue(currentGameIDState);

  return (
    //TODO: handle loading game page
    <div>
      Game
      <span>Opp. id:{opponentID}</span>
      <br />
      {/* <span>Game id:{currentGameID}</span> */}
      {/* <GameChannel /> */}
      <GameBoard />
    </div>
  );
}
