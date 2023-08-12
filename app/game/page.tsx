"use client";
import { useEffect } from "react";
import { useCreateGame } from "../hooks/channelHooks";
import { opponentIDState, opponentProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function Game() {
  const opponentID = useRecoilValue(opponentIDState);

  // // console.log("opponent in game", opponent);
  // const game = useCreateGame();
  useEffect(() => {
    console.log(opponentID);
  }, [opponentID]);
  return (
    <div>
      Game
      {opponentID}
    </div>
  );
}
