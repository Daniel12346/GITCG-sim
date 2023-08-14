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
      onClick={() => {
        setMyCurrentDeckID(id);
      }}
    >
      set active
    </button>
  );
}
