"use client";
import {
  myIDState,
  playerBattleLogsState,
  playerBattleStatsState,
} from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerBattleStats from "./PlayerBattleStats";
import Link from "next/link";

export default function BattleLogs() {
  const myID = useRecoilValue(myIDState);
  const battleLogs = useRecoilValue(playerBattleLogsState(myID));
  const battleStats = useRecoilValue(playerBattleStatsState(myID));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-slate-100 flex flex-col gap-6 max-w-lg">
        <PlayerBattleStats playerID={myID}></PlayerBattleStats>
        {battleLogs?.map(
          ({ created_at, turn_count, player1, player2, winner_id }) => (
            <div
              key={created_at}
              className="flex flex-col gap-1 bg-slate-200 bg-opacity-10 border-solid border-4 px-6 py-4"
            >
              <div className="flex justify-between text-blue-100 font-light">
                {created_at && (
                  <span>{new Date(created_at).toLocaleString()}</span>
                )}
                <span>ROUNDS: {turn_count}</span>
              </div>
              <div className="flex gap-3 text-xl">
                <div>
                  <Link href={`/player/${player1?.id}`}>
                    <img
                      className="rounded-sm w-14 h-14 object-cover object-center"
                      src={player1?.avatar_url || "/card_back_origin.png"}
                    />

                    <span>{player1?.username} </span>
                  </Link>
                </div>
                <span className="font-semibold flex items-end text-blue-300">
                  VS
                </span>
                <div>
                  <Link href={`/player/${player2?.id}`}>
                    <img
                      className="rounded-sm w-14 h-14 object-cover object-center"
                      src={player2?.avatar_url || "/card_back_origin.png"}
                    />
                    <span>{player2?.username}</span>
                  </Link>
                </div>
                <div
                  className={`
                    w-full
                    flex items-center  font-bold justify-end
                    ${winner_id === myID ? "text-green-400" : "text-red-400"}`}
                >
                  <span className="ml-3">
                    {winner_id === myID ? "VICTORY" : "DEFEAT"}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
