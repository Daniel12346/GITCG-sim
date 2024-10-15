import { amIGameWinnerState, gameWinnerIDState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function GameOver() {
  const gameWinnerID = useRecoilValue(gameWinnerIDState);
  const amIGameWinner = useRecoilValue(amIGameWinnerState);
  return (
    gameWinnerID && (
      <div>
        <h1>Game Over</h1>
        <h2>{amIGameWinner ? "You Win!" : "You Lose"}</h2>
      </div>
    )
  );
}
