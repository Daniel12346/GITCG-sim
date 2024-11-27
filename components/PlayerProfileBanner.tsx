import { Tables } from "@/lib/database.types";
import { userAvatarState, userBannerState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import EditAvatar from "./EditAvatar";
import EditBanner from "./EditBanner";

type Props = {
  playerProfile: Tables<"profile"> | null;
  isMyProfile?: boolean;
};
export default function PlayerProfileBanner({
  playerProfile,
  //TODO: calculate isMyProfile in component
  isMyProfile,
}: Props) {
  const userAvatar = useRecoilValue(userAvatarState(playerProfile?.id));
  const userBanner = useRecoilValue(userBannerState(playerProfile?.id));
  return (
    <div
      className={` 
        relative
        py-2
        z-100
        bg-indigo-600
        border-4 
         flex flex-col  lg:flex-row lg:items-center px-6 gap-4 min-w-fit`}
    >
      {userBanner && (
        <>
          <img
            src={userBanner}
            className="absolute object-cover top-0 left-0 border-inherit w-full h-full z-10"
          ></img>
          {isMyProfile && (
            <div className="absolute object-cover top-0 left-0 border-inherit w-full h-full bg-gradient-to-r from-slate-800/80 to-slate-800/10 z-10">
              <EditBanner />
            </div>
          )}
        </>
      )}
      <div className="flex relative w-fit">
        {isMyProfile && (
          <div className="absolute top-0 right-0 w-fit h-fit z-30">
            <EditAvatar />
          </div>
        )}
        <img
          className="rounded-sm w-14 h-14 object-cover z-10 object-center"
          src={userAvatar || "/card_back_origin.png"}
        />
      </div>
      <span className="font-bold text-xl text-blue-100 z-10">
        {playerProfile?.username}
      </span>
    </div>
  );
}
