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
        <div>
          <span>Opponent found!</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <span>Looking for opponent...</span>
          <div>
            <img
              src="/dice_spinner.svg"
              className="w-48 h-48 slow-spin-and-fade"
            />
          </div>
        </div>
      )}
    </div>
  );
}
