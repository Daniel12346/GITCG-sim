import { myIDState, myProfileState, userProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerCurrentDeckDisplay from "./PlayerCurrentDeckDisplay";
import PlayerBattleStats from "./PlayerBattleStats";
import MyProfileBanner from "./MyProfileBanner";

export default function MyProfile() {
  const myID = useRecoilValue(myIDState);
  return (
    <div className="flex flex-col">
      <MyProfileBanner />;
      <div className="text-slate-200">
        <PlayerBattleStats playerID={myID} />
      </div>
      {/* <span className="text-blue-200">current deck</span> */}
      <PlayerCurrentDeckDisplay playerID={myID} canBeCopied={false} />
    </div>
  );
}
