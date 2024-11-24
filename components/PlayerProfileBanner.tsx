import { uploadToSupabaseBucket } from "@/app/utils";
import { Tables } from "@/lib/database.types";
import {
  myAvatarState,
  userAvatarState,
  userBannerState,
} from "@/recoil/atoms";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";

type Props = {
  playerProfile: Tables<"profile"> | null;
  isMyProfile?: boolean;
};
export default function PlayerProfileBanner({
  playerProfile,
  isMyProfile,
}: Props) {
  const userAvatar = useRecoilValue(userAvatarState(playerProfile?.id));
  useEffect(() => {
    console.log("userAvatar", userAvatar, playerProfile?.id);
  }, [userAvatar]);
  const userBanner = useRecoilValue(userBannerState(playerProfile?.id));
  console.log("userBanner", userBanner, playerProfile?.id);
  return (
    <div
      className={` 
        relative
        py-2
        z-100
        bg-indigo-600
        border-4 
         flex flex-col  lg:flex-row lg:items-center pl-2 pr-3 gap-6 min-w-fit`}
    >
      {userBanner && (
        <>
          <img
            src={userBanner}
            className="absolute object-cover top-0 left-0 border-inherit w-full h-full z-10"
          ></img>
          <div className="absolute object-cover top-0 left-0 border-inherit w-full h-full bg-gradient-to-r from-slate-800/60 to-slate-800/10 z-10"></div>
        </>
      )}

      <img
        className="rounded-sm w-14 h-14 object-cover z-10 object-center"
        src={userAvatar || "/card_back_origin.png"}
      />
      <span className="font-bold text-xl text-blue-100 z-10">
        {playerProfile?.username}
      </span>
    </div>
  );
}
