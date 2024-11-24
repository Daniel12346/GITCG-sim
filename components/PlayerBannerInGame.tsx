import { Tables } from "@/lib/database.types";
import {
  isActionPhaseState,
  isMyTurnState,
  userAvatarState,
  userBannerState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

type Props = {
  playerProfile: Tables<"profile"> | null;
  isMyProfile?: boolean;
};
export default function PlayerBannerInGame({
  playerProfile,
  isMyProfile,
}: Props) {
  //TODO: add loadable state
  const isMyTurn = useRecoilValue(isMyTurnState);
  const isActionPhase = useRecoilValue(isActionPhaseState);
  const userAvatar = useRecoilValue(userAvatarState(playerProfile?.id));
  const userBanner = useRecoilValue(userBannerState(playerProfile?.id));
  return (
    <div
      className={`
        py-2
        relative
        ${isMyProfile ? "bottom-0 rounded-tr-lg" : "top-0 rounded-br-lg"}
        z-100
        bg-indigo-600
        border-4 border-l-0 
        ${
          isMyProfile
            ? isMyTurn && isActionPhase && "border-green-400"
            : !isMyTurn && isActionPhase && "border-red-600"
        }
         flex flex-col  lg:flex-row lg:items-center pl-2 pr-3 gap-6 min-w-fit`}
    >
      {userBanner && (
        <img
          src={userBanner}
          className="absolute object-cover top-0 left-0 border-inherit w-full h-full bg-red-100 z-10"
        ></img>
      )}
      <img
        className="rounded-sm z-10 w-14 h-14 object-cover object-center"
        src={userAvatar || "/card_back_origin.png"}
      />
      <span className="font-bold z-10 text-xl text-blue-100">
        {playerProfile?.username}
      </span>
    </div>
  );
}
