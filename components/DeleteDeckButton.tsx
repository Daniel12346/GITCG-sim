"use client";
import { deleteDeck } from "@/app/utils";
import { Tables } from "@/lib/database.types";
import { myCurrentDeckIDState, myDecksState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  useRecoilRefresher_UNSTABLE,
  useRecoilState,
  useRecoilValue,
} from "recoil";

interface Props {
  deck: Tables<"deck">;
}
export default function DeleteDeck({ deck }: Props) {
  const myCurrentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const refresheDecks = useRecoilRefresher_UNSTABLE(myDecksState);

  return deck.id === myCurrentDeckID ? null : (
    <div className="flex gap-2 items-center mb-2">
      <button
        className="bg-red-100 hover:bg-red-200 text-red-700  px-1 rounded font-bold"
        onClick={() => {
          //TODO: icon
          deleteDeck({
            client,
            deckID: deck.id,
          })
            .then(() => {
              refresheDecks();
            })
            .catch((error) => {
              console.error("Error deleting deck", error);
            });
        }}
      >
        X
      </button>
    </div>
  );
}
