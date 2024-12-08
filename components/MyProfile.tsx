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
      <PlayerProfileBanner playerProfile={myProfile} isMyProfile />;
      <div className="text-slate-200">
        <PlayerBattleStats playerID={myID} />
      </div>
      {/* <span className="text-blue-200">current deck</span> */}
      <PlayerCurrentDeckDisplay playerID={myID} canBeCopied={false} />
    </div>
  );
}
