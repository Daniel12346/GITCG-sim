"use client";
import { myIDState, mySessionState } from "@/recoil/atoms";
import {
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from "recoil";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Suspense, useEffect } from "react";
import MyDecks from "@/components/MyDecks";
import dynamic from "next/dynamic";

//TODO: why does this work?
const MyDecksNoSSR = dynamic(() => import("@/components/MyDecks"), {
  ssr: false,
});
const MyInfoNoSSR = dynamic(() => import("@/components/MyInfo"), {
  ssr: false,
});

export default function Me() {
  // const [deckIDs, setDeckIDs] = useState<string[]>([]);
  return (
    <>
      <div>
        <h1>Me</h1>
        <MyInfoNoSSR />
        {/* //TODO: why does this keep loading when I add Suspense? */}
        {/* My Id: {mySession?.user.id} */}
        <MyDecksNoSSR />
      </div>
    </>
  );
}
