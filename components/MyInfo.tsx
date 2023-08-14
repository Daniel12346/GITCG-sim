"use client";
import { myIDState, myCurrentDeckIDState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function MyInfo() {
  const myID = useRecoilValue(myIDState);
  const currentDeckID = useRecoilValue(myCurrentDeckIDState);

  return (
    <div>
      <div>My ID: {myID}</div>
      <div>My deck ID: {currentDeckID}</div>
    </div>
  );
}
