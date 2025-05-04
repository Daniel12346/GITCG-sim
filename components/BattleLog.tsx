import { myIDState, userAvatarState } from "@/recoil/atoms";
import Link from "next/link";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";

interface BattleLogProps {
  battleLog: BattleLog;
}
export default function BattleLog({
  battleLog: { created_at, turn_count, player1, player2, winner_id },
}: BattleLogProps) {
  const myID = useRecoilValue(myIDState);
  const player1Avatar = useRecoilValue(userAvatarState(player1?.id));
  const player2Avatar = useRecoilValue(userAvatarState(player2?.id));
  useEffect(() => {
    console.log("player1Avatar", player1Avatar);
    console.log("player2Avatar", player2Avatar);
  }, [player1Avatar, player2Avatar]);

  return (
    <div
      key={created_at}
      className="flex flex-col gap-1 bg-slate-200 bg-opacity-10 border-solid border-4 px-6 py-4"
    >
      <div className="flex justify-between text-blue-100 font-light">
        {created_at && <span>{new Date(created_at).toLocaleString()}</span>}
        <span>ROUNDS: {turn_count}</span>
      </div>
      <div className="flex gap-3 text-xl">
        <div>
          <Link href={`/player/${player1?.id}`}>
            <img
              className="rounded-sm w-14 h-14 object-cover object-center"
              src={player1Avatar || "/card_back_origin.png"}
            />

            <span>{player1?.username} </span>
          </Link>
        </div>
        <span className="font-semibold flex items-end text-blue-300">VS</span>
        <div>
          <Link href={`/player/${player2?.id}`}>
            <img
              className="rounded-sm w-14 h-14 object-cover object-center"
              src={player2Avatar || "/card_back_origin.png"}
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
  );
}
