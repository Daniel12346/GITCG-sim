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
  const opponentID = useRecoilValue(opponentIDState);

  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  // const currentGameID = useRecoilValue(currentGameIDState);
  const myDeckInGameCards = useRecoilValue(myInGameCardsState);
  const params = useParams();

  return (
    //TODO: handle loading game page
    <div>
      Game ID: {params.id}
      <br></br>
      <span>Opp. id:{opponentID}</span>
      <br />
      {/* <span>Game id:{currentGameID}</span> */}
      <GameChannel />
      <GameBoard />
    </div>
  );
}
