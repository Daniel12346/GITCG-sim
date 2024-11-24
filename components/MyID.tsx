"use client";
import { myAvatarState, myProfileState, mySessionState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import TextWithSlideInUnderline from "./TextWithSlideInUnderline";

export default function MyID() {
  const myProfile = useRecoilValue(myProfileState);
  const myAvatar = useRecoilValue(myAvatarState);
  return (
    <div className="px-2 text-slate-200 flex items-center gap-2">
      <span className="font-thin">logged in as:</span>
      <Link href="/me" className="flex items-center gap-2 group cursor-pointer">
        <span>
          <img
            className="rounded-sm w-8 h-8 object-cover object-center"
            src={myAvatar || "/card_back_origin.png"}
          />
        </span>
        <span className="text-lg">
          <TextWithSlideInUnderline>
            {" " + myProfile?.username}
          </TextWithSlideInUnderline>
        </span>
      </Link>
      <div>{myProfile && <LogoutButton />}</div>
    </div>
  );
}
