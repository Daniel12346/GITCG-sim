"use client";
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
