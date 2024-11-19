import { Tables } from "@/lib/database.types";
import { isActionPhaseState, isMyTurnState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

type Props = {
  playerProfile: Tables<"profile"> | null;
};
export default function PlayerProfileBanner({ playerProfile }: Props) {
  //TODO: add loadable state
  return (
    <div
      className={` 
        py-2
        z-100
        bg-indigo-600
        border-4 
     
         flex flex-col  lg:flex-row lg:items-center pl-2 pr-3 gap-6 min-w-fit`}
    >
      <img
        className="rounded-sm w-14 h-14 object-cover object-center"
        src={playerProfile?.avatar_url || "/card_back_origin.png"}
      />
      <span className="font-bold text-xl text-blue-100">
        {playerProfile?.username}
      </span>
    </div>
  );
}
