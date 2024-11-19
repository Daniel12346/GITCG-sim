import { myProfileState, userProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerProfileBanner from "./PlayerProfileBanner";
import PlayerCurrentDeckDisplay from "./PlayerCurrentDeckDisplay";
import PlayerBattleStats from "./PlayerBattleStats";

type Props = {
  playerID: string;
};
export default function MyProfile({ playerID }: Props) {
  const myProfile = useRecoilValue(myProfileState);
  return (
    <div className="flex flex-col">
      {/* TODO: make profile image and banner customizable */}
      <PlayerProfileBanner playerProfile={myProfile} />;
      <div className="text-slate-200">
        <PlayerBattleStats playerID={playerID} />
      </div>
      {/* <span className="text-blue-200">current deck</span> */}
      <PlayerCurrentDeckDisplay playerID={playerID} canBeCopied={false} />
    </div>
  );
}
