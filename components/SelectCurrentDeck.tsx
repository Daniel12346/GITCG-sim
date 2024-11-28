"use client";
import { Tables } from "@/lib/database.types";
import {
  deckInDeckBuilderNameState,
  myCurrentDeckIDState,
} from "@/recoil/atoms";
import { useRecoilState, useSetRecoilState } from "recoil";

interface Props {
  deck: Tables<"deck">;
}
export default function SelectCurrentDeck({ deck }: Props) {
  const [myCurrentDeckID, setMyCurrentDeckID] =
    useRecoilState(myCurrentDeckIDState);
  const setDeckInDeckBuilderName = useSetRecoilState(
    deckInDeckBuilderNameState
  );

  return deck.id === myCurrentDeckID ? null : (
    <div className="flex gap-2 items-center  font-semibold">
      <span>{deck.name}</span>
      <button
        className="bg-indigo-400/50 hover:bg-indigo-500 text-white-700  px-1 rounded-sm"
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
