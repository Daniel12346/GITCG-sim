import { copyDeck } from "@/app/utils";
import { myIDState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRecoilValue } from "recoil";

export default function DeckCopyButton({
  deckCards,
  deckName,
}: {
  deckCards: CardBasicInfoWithQuantityAndEffects[];
  deckName: string;
}) {
  const [copyingState, setCopyingState] = useState<
    "INITIAL" | "LOADING" | "COMPLETED" | "ERROR"
  >("INITIAL");
  const myID = useRecoilValue(myIDState);
  const client = createClientComponentClient<Database>();
  const handleCopyDeck = async () => {
    setCopyingState("LOADING");
    try {
      await copyDeck({
        client,
        deckName,
        deckCards,
        myID,
      });
      setCopyingState("COMPLETED");
    } catch (error) {
      console.error("Error copying deck", error);
      setCopyingState("ERROR");
    }
  };

  return (
    <>
      <span className="text-blue-200 mx-2">
        {copyingState === "LOADING" && "Copying..."}
        {copyingState === "COMPLETED" && (
          <span>
            <span className="mx-1">Deck copied!</span>
            <Link href="/deck-builder">Go to deck builder</Link>
          </span>
        )}
        {copyingState === "ERROR" && "Error copying deck"}
      </span>
      <button
        onClick={handleCopyDeck}
        // relative after:absolute after:w-full after:bottom-0 after:left-0  after:bg-orange-950 after:transition-all after:duration-300 after:rounded-sm after:transform after:scale-x-0 after:origin-left
        // after:block hover:after:scale-x-100 after:z-100 after:h-1
        className={` w-fit flex gap-1 items-center h-8  bg-yellow-100/80 mb-1  text-orange-950 px-1 cursor-pointer font-semibold rounded-sm text-center hover:bg-yellow-100 hover:transition-all hover:duration-200 hover:rounded-sm   
        `}
      >
        <Copy size={20} className="" />
        copy
      </button>
    </>
  );
}
