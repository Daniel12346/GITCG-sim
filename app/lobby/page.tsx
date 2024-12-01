"use client";

import useLobbyChannel from "@/components/useLobbyChannel";
import { ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

export default function Lobby() {
  const LobbyInfoNoSSR = dynamic(() => import("@/components/LobbyInfo"), {
    ssr: false,
  });

  const router = useRouter();
  useLobbyChannel();

  return (
    <div className="pt-20 max-w-xl w-full">
      <button
        className="text-lg flex items-center text-slate-100  mb-4 text-center rounded px-2 py-1 bg-red-800 hover:bg-red-700"
        onClick={() => {
          router.push("/");
        }}
      >
        <ChevronLeft size={24} />
        cancel
      </button>
      <LobbyInfoNoSSR />
    </div>
  );
}
