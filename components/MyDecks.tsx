"use client";

import { myCurrentDeckIDState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import SelectCurrentDeck from "./SelectCurrentDeck";
import { useRecoilValue } from "recoil";

interface Props {
  userId: string;
}
type Deck = Database["public"]["Tables"]["deck"]["Row"];

export default function ClientComponent({ userId }: Props) {
  const supabase = createClientComponentClient<Database>();
  const [decks, setDecks] = useState<Deck[]>();
  const myCurrentDeckID = useRecoilValue(myCurrentDeckIDState);
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
            {myCurrentDeckID !== deck.id && <SelectCurrentDeck deck={deck} />}
          </div>
        );
      })}
    </div>
  );
}
