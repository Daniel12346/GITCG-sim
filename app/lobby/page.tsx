"use client";

import { ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

export default function Lobby() {
  const LobbyInfoNoSSR = dynamic(() => import("@/components/LobbyInfo"), {
    ssr: false,
  });

  return (
    <div className="pt-20 max-w-xl w-full">
      <Link href="/">
        <button className="text-lg flex items-center text-slate-100  mb-4 text-center rounded px-2 py-1 bg-red-800 hover:bg-red-700">
          <ChevronLeft size={24} />
          cancel
        </button>
      </Link>
      <LobbyInfoNoSSR />
    </div>
  );
}
