"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const PlayerProfileNoSSR = dynamic(() => import("@/components/PlayerProfile"), {
  ssr: false,
});

export default function Player() {
  const params = useParams();
  const playerID = params.id as string;
  return (
    <div className="flex justify-center max-w-lg mt-3">
      <PlayerProfileNoSSR playerID={playerID} />
    </div>
  );
}
