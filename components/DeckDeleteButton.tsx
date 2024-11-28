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
  deckID: string | undefined;
}
export default function DeleteDeck({ deckID }: Props) {
  const myCurrentDeckID = useRecoilValue(myCurrentDeckIDState);
  const client = createClientComponentClient<Database>();
  const refreshDecks = useRecoilRefresher_UNSTABLE(myDecksState);

  return deckID === myCurrentDeckID ? null : (
    <div className="flex gap-2 items-center">
      <button
        className="bg-red-600/40 hover:bg-red-600 text-red-200  px-1 rounded font-bold"
        onClick={() => {
          if (deckID === undefined) {
            return;
          }
          //TODO: icon
          deleteDeck({
            client,
            deckID,
          })
            .then(() => {
              refreshDecks();
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
