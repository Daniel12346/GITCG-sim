"use client";

import { myCurrentDeckIDState, myDecksState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Suspense, useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import SetCurrentDeck from "./SetCurrentDeck";
import CurrentDeckDisplay from "./CurrentDeckDisplay";

interface Props {
  userId: string;
}
// type Deck = Database["public"]["Tables"]["deck"]["Row"];

export default function ClientComponent() {
  const myDecks = useRecoilValue(myDecksState);

  return (
    <div>
      {myDecks?.map((deck) => (
        <div key={deck.id}>
          <span>{deck.name}</span>
          <SetCurrentDeck id={deck.id} />
        </div>
      ))}
      <Suspense fallback={<div>loading deck display</div>}>
        <CurrentDeckDisplay></CurrentDeckDisplay>
      </Suspense>
    </div>
  );
}
