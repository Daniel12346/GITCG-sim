import { userProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerProfileBanner from "./PlayerProfileBanner";
import PlayerCurrentDeckDisplay from "./PlayerCurrentDeckDisplay";
import PlayerBattleStats from "./PlayerBattleStats";

type Props = {
  playerID: string;
};
export default function PlayerProfile({ playerID }: Props) {
  const playerProfile = useRecoilValue(userProfileState(playerID));
  return (
    <div className="flex flex-col">
      <PlayerProfileBanner playerProfile={playerProfile} />;
      <div className="text-slate-200">
        <PlayerBattleStats playerID={playerID} />
      </div>
      {/* <span className="text-blue-200">current deck</span> */}
      <PlayerCurrentDeckDisplay playerID={playerID} />
    </div>
  );
}
