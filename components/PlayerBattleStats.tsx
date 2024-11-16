import { playerBattleStatsState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

type Props = {
  playerID: string;
};
export default function PlayerBattleStats({ playerID }: Props) {
  const battleStats = useRecoilValue(playerBattleStatsState(playerID));
  return (
    <div className="self-center text-xl flex gap-3">
      <span>
        Wins:
        <span className="ml-1 text-green-400">{battleStats?.wins}</span>
      </span>
      <span>
        Losses:
        <span className="ml-1 text-red-400">{battleStats?.losses}</span>
      </span>
    </div>
  );
}
