"use client";
import { myProfileState, mySessionState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import LogoutButton from "./LogoutButton";

export default function MyID() {
  const myProfile = useRecoilValue(myProfileState);
  return (
    <div className="text-blue-200">
      <span>
        logged in as:
        <span>{" " + myProfile?.username}</span>
      </span>
      {myProfile && <LogoutButton />}
    </div>
  );
}
