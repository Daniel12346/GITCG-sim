"use client";
import { myIDState } from "@/recoil/atoms";
import {
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Suspense, useEffect } from "react";
import MyDecks from "@/components/MyDecks";
import { useMySession } from "../hooks/userDataHooks";
import dynamic from "next/dynamic";

const Decks = dynamic(() => import("@/components/MyDecks"), {
  ssr: false,
});

export default function Me() {
  useMySession();
  const myID = useRecoilValue(myIDState);

  // const [deckIDs, setDeckIDs] = useState<string[]>([]);

  return (
    <>
      <div>
        <h1>Me</h1>
        {/* //TODO: why does this keep loading when I add Suspense? */}
        My Id: {myID}
        <Suspense fallback={<div>loading decks</div>}>
          <Decks />
        </Suspense>
      </div>
    </>
  );
}
