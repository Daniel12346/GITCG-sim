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
// import MyDecks from "@/components/MyDecks";
import dynamic from "next/dynamic";

const DeckDisplayNoSSR = dynamic(() => import("@/components/DeckDisplay"), {
  ssr: false,
});
// const MyDecksNoSSR = dynamic(() => import("@/components/MyDecks"), {
//   ssr: false,
// });
const MyInfoNoSSR = dynamic(() => import("@/components/MyInfo"), {
  ssr: false,
});

export default function Me() {
  // const [deckIDs, setDeckIDs] = useState<string[]>([]);
  return (
    <>
      <div className="w-full">
        <h1>Me</h1>
        <MyInfoNoSSR />
        {/* My Id: {mySession?.user.id} */}
        {/* <MyDecksNoSSR /> */}
        <DeckDisplayNoSSR />
      </div>
    </>
  );
}
