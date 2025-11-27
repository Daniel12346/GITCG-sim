import { Tables } from "@/lib/database.types";
import { myAvatarState, myBannerState, myProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import EditAvatar from "./EditAvatar";
import EditBanner from "./EditBanner";
export default function MyProfileBanner() {
  const myProfile = useRecoilValue(myProfileState);
  const myAvatar = useRecoilValue(myAvatarState);
  const myBanner = useRecoilValue(myBannerState);
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
      <>
        <div className="z-50 absolute top-1 left-1">
          <EditBanner />
        </div>
        {myBanner && (
          <>
            <img
              src={myBanner}
              className="absolute object-cover top-0 left-0 border-inherit w-full h-full z-10"
            ></img>
            <div className="z-50 absolute top-1 left-1">
              {/* <EditBanner /> */}
            </div>
            <div className="absolute object-cover top-0 left-0 border-inherit w-full h-full bg-gradient-to-r from-slate-800/60 to-slate-700/0 z-10"></div>
          </>
        )}
      </>

      <div className="flex relative w-fit z-10">
        <div className="absolute top-0 right-0 w-fit h-fit z-30">
          <EditAvatar />
        </div>
        <img
          className="rounded-sm w-14 h-14 object-cover z-10 object-center"
          src={myAvatar || "/card_back_origin.png"}
        />
      </div>
      <span className="font-bold text-xl text-blue-100 z-10">
        {myProfile?.username ?? "guest"}
      </span>
    </div>
  );
}
