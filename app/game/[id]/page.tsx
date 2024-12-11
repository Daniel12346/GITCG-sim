"use client";
import GameBoard from "@/components/GameBoard";
import CurrentViewedCardDisplay from "@/components/CurrentViewedCard";

export default function Game() {
  return (
    <div className="w-full max-h-screen">
      <div className="grid grid-cols-[5fr_1fr] bg-indigo-950">
        <GameBoard />
        <CurrentViewedCardDisplay />
      </div>
    </div>
  );
}
