import { myIDState, opponentIDState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import PlayerBoard from "./PlayerBoard";
import TurnAndPhase from "./TurnAndPhase";

export default function GameBoard() {
  const myID = useRecoilValue(myIDState);
  const opponentID = useRecoilValue(opponentIDState);

  return (
    <div className="w-full">
      <PlayerBoard playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerID={myID} />
    </div>
  );
}
