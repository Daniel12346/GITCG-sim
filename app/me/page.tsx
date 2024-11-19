"use client";
import MyProfile from "@/components/MyProfile";
import { myIDState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function Me() {
  const myID = useRecoilValue(myIDState);
  return (
    <div className="flex justify-center max-w-lg mt-3">
      <MyProfile playerID={myID} />
    </div>
  );
}
