"use client";
import { opponentProfileState } from "@/recoil/atoms";
import { useRecoilStateLoadable, useRecoilValue } from "recoil";

export default function LobbyInfo() {
  // const myID = useRecoilValue(myIDState);
  // const currentDeckID = useRecoilValue(myCurrentDeckIDState);
  const opponentProfile = useRecoilValue(opponentProfileState);
  //TODO: use loadable
  // const [opponentProfileLoadable, setOpponentProfileLoadable] =
  //   useRecoilStateLoadable(opponentProfileState);

  return (
    <div className="text-slate-300">
      <div className="flex justify-center w-full"></div>
      {opponentProfile ? (
        <span>Opponent found!</span>
      ) : (
        <span>Looking for opponent...</span>
      )}
    </div>
  );
}
