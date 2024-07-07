"use client";

import { myDecksState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import SetCurrentDeck from "./SetCurrentDeck";

interface Props {
  userId: string;
}
type Deck = Database["public"]["Tables"]["deck"]["Row"];

export default function ClientComponent({ userId }: Props) {
  const supabase = createClientComponentClient<Database>();
  const [decks, setDecks] = useState<Deck[]>();
  useEffect(() => {
    const getDecks = async () => {
      const { data } = await supabase
        .from("deck")
        .select("*, deck_card_basic_info(*)")
        .eq("player_id", userId);
      if (data) {
        setDecks(data);
      }
    };
    getDecks();
  }, [supabase, setDecks, userId]);
  return (
    <div>
      {decks?.map((deck) => {
        return (
          <div key={deck.id}>
            <span>{deck.name}</span>
            <SetCurrentDeck id={deck.id} />
          </div>
        );
      })}
    </div>
  );
}
