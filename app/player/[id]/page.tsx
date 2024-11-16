"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const PlayerCurrentDeckDisplayNoSSR = dynamic(
  () => import("@/components/PlayerCurrentDeckDisplay"),
  {
    ssr: false,
  }
);

export default function Player() {
  const params = useParams();
  const playerID = params.id as string;
  console.log(playerID);
  return (
    <div className="flex justify-center max-w-lg">
      <PlayerCurrentDeckDisplayNoSSR
        playerID={playerID}
      ></PlayerCurrentDeckDisplayNoSSR>
    </div>
  );
}
