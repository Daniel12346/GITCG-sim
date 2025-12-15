import { cn } from "@/lib/utils";
import { playerErrorMessageState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";

export default function PlayerError() {
  const playerErrorMessage = useRecoilValue(playerErrorMessageState);
  return (
    <div
      className={cn(
        "flex justify-center  text-red-600 items-center opacity-0",
        playerErrorMessage && "opacity-100"
      )}
    >
      <span className="bg-red-800 p-1 text-red-100 rounded-sm border-4 border-red-400 border-solid">
        {playerErrorMessage}
      </span>
    </div>
  );
}
