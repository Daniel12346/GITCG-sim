import { myIDState, myProfileState, userProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerProfileBanner from "./PlayerProfileBanner";
import PlayerCurrentDeckDisplay from "./PlayerCurrentDeckDisplay";
import PlayerBattleStats from "./PlayerBattleStats";

export default function MyProfile() {
  const myProfile = useRecoilValue(myProfileState);
  const myID = useRecoilValue(myIDState);
  return (
    <div className="flex flex-col">
      <PlayerProfileBanner isMyProfile={true} playerProfile={myProfile} />
      <div className="flex flex-col">
        <span className="text-blue-300 uppercase font-semibold">settings</span>
        {/* <SelectAvatar />
        <SelectBanner /> */}
      </div>
      <div className="text-slate-200">
        <PlayerBattleStats playerID={myID} />
      </div>
      <PlayerCurrentDeckDisplay playerID={myID} canBeCopied={false} />
    </div>
  );
}
