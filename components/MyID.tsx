"use client";
import { myProfileState, mySessionState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import LogoutButton from "./LogoutButton";

export default function MyID() {
  const myProfile = useRecoilValue(myProfileState);
  return (
    <div className="px-2 text-slate-200 flex items-center gap-2">
      <span className="font-thin">logged in as:</span>
      <span className="text-lg">{" " + myProfile?.username}</span>
      {myProfile && <LogoutButton />}
    </div>
  );
}
