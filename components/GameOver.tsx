import {
  amIGameWinnerState,
  gameOverMessageState,
  gameWinnerIDState,
} from "@/recoil/atoms";
import Link from "next/link";
import { useRecoilValue } from "recoil";

export default function GameOver() {
  const gameWinnerID = useRecoilValue(gameWinnerIDState);
  const amIGameWinner = useRecoilValue(amIGameWinnerState);
  const gameOverMessage = useRecoilValue(gameOverMessageState);
  return (
    gameWinnerID && (
      <div
        className="absolute top-[50%]
    left-[50%] -translate-x-1/2 -translate-y-1/2
      flex items-center justify-center z-[100] overflow-hidden pointer-events-none"
      >
        <div className="animate-in border-solid border-4 overflow-hidden pointer-events-auto bg-overlay border-yellow-300 p-4">
          <div className="flex flex-col gap-4 p-3">
            <span className="text-6xl font-extrabold">
              {amIGameWinner ? (
                <span className="text-green-300">YOU WIN</span>
              ) : (
                <span className="text-red-400">YOU LOSE</span>
              )}
            </span>
            <span className="text-xl font-bold text-slate-200">
              {gameOverMessage || "Game Over"}
            </span>
          </div>
          <div className="flex justify-between w-full ">
            <Link href="/">
              <button onClick={() => {}}>exit game</button>
            </Link>
          </div>
        </div>
      </div>
    )
  );
}
