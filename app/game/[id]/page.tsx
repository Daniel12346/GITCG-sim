"use client";
import GameBoard from "@/components/GameBoard";
import CurrentViewedCardDisplay from "@/components/CurrentViewedCard";
import CardAttacks from "@/components/CardAttacks";

export default function Game() {
  return (
    <div className="w-full max-h-screen">
      <div className="grid md:grid-cols-[5fr_1fr] bg-indigo-950">
        <GameBoard />
        <div className="md:hidden h-28 flex justify-center">
          {<CardAttacks />}
        </div>
        <div className="hidden md:block">
          <CurrentViewedCardDisplay />
        </div>
      </div>
    </div>
  );
}
