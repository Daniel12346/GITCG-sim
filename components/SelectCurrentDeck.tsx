"use client";
import { Tables } from "@/lib/database.types";
import {
  deckInDeckBuilderNameState,
  myCurrentDeckIDState,
} from "@/recoil/atoms";
import { useRouter } from "next/navigation";
import { useRecoilValue, useSetRecoilState } from "recoil";

interface Props {
  deck: Tables<"deck">;
}
export default function SetCurrentDeck({ deck }: Props) {
  const setMyCurrentDeckID = useSetRecoilState(myCurrentDeckIDState);
  const setDeckInDeckBuilderName = useSetRecoilState(
    deckInDeckBuilderNameState
  );
  return (
    <div className="flex gap-2 items-center mb-2">
      <span>{deck.name}</span>
      <button
        className="bg-blue-600 hover:bg-blue-400 text-blue-100  px-1 rounded"
        onClick={() => {
          setMyCurrentDeckID(deck.id);
          setDeckInDeckBuilderName(deck.name ?? "");
        }}
      >
        set active
      </button>
    </div>
  );
}
