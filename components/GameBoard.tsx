import { myIDState, opponentIDState, currentGameIDState } from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import PlayerBoard from "./PlayerBoard";
import TurnAndPhase from "./TurnAndPhase";
import { useEffect } from "react";

export default function GameBoard() {
  const myID = useRecoilValue(myIDState);
  const [opponentID, setOpponentID] = useRecoilState(opponentIDState);
  const setGameID = useSetRecoilState(currentGameIDState);

  useEffect(() => {
    return () => {
      setOpponentID("");
      setGameID("");
    };
  }, []);
  return (
    <div className="w-full">
      <PlayerBoard playerID={opponentID} />
      <TurnAndPhase />
      <PlayerBoard playerID={myID} />
    </div>
  );
}
