"use client";
import {
  myIDState,
  playerBattleLogsState,
  playerBattleStatsState,
  userAvatarState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerBattleStats from "./PlayerBattleStats";
import Link from "next/link";
import BattleLog from "./BattleLog";

export default function BattleLogs() {
  const myID = useRecoilValue(myIDState);
  const battleLogs = useRecoilValue(playerBattleLogsState(myID));
  const battleStats = useRecoilValue(playerBattleStatsState(myID));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-slate-100 flex flex-col gap-6 max-w-lg">
        <PlayerBattleStats playerID={myID}></PlayerBattleStats>
        {battleLogs?.map((battleLog) => (
          <BattleLog battleLog={battleLog} key={battleLog.created_at} />
        ))}
      </div>
    </div>
  );
}
