"use client";
import { Suspense, useEffect } from "react";
import { useCreateGame } from "../hooks/channelHooks";
import {
  currentGameIDState,
  opponentIDState,
  opponentProfileState,
  myDeckInGameCardsState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function Game() {
  const opponentID = useRecoilValue(opponentIDState);

  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  // const currentGameID = useRecoilValue(currentGameIDState);
  const myDeckInGameCards = useRecoilValue(myDeckInGameCardsState);

  return (
    //TODO: handle loading game page
    <div>
      Game
      <span>Opp. id:{opponentID}</span>
      <br />
      {/* <span>Game id:{currentGameID}</span> */}
    </div>
  );
}
