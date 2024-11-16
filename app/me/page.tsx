"use client";
import { myIDState } from "@/recoil/atoms";
import dynamic from "next/dynamic";
import { useRecoilValue } from "recoil";

const DeckDisplayNoSSR = dynamic(() => import("@/components/MyDecksDisplay"), {
  ssr: false,
});
// const MyDecksNoSSR = dynamic(() => import("@/components/MyDecks"), {
//   ssr: false,
// });
const MyInfoNoSSR = dynamic(() => import("@/components/MyInfo"), {
  ssr: false,
});
const PlayerCurrentDeckDisplayNoSSR = dynamic(
  () => import("@/components/PlayerCurrentDeckDisplay"),
  {
    ssr: false,
  }
);

export default function Me() {
  const myID = useRecoilValue(myIDState);
  return (
    <div className="flex flex-col w-full items-center">
      <div className="max-w-xl flex flex-col gap-4">
        <div className="max-w-md">
          <MyInfoNoSSR />
        </div>
        {/* <MyDecksNoSSR /> */}
        <div className="flex justify-center max-w-lg">
          <PlayerCurrentDeckDisplayNoSSR
            playerID={myID}
          ></PlayerCurrentDeckDisplayNoSSR>
        </div>
      </div>
    </div>
  );
}
