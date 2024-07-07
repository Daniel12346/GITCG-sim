"use client";
import { myCurrentDeckIDState } from "@/recoil/atoms";
import { useRouter } from "next/navigation";
import { useSetRecoilState } from "recoil";

interface Props {
  id: string;
}
export default function SetCurrentDeck({ id }: Props) {
  const setMyCurrentDeckID = useSetRecoilState(myCurrentDeckIDState);
  const router = useRouter();
  return (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
      onClick={() => {
        setMyCurrentDeckID(id);
      }}
    >
      set active
    </button>
  );
}
