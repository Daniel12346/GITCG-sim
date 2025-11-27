"use client";
import { signOutAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { myCurrentDeckIDState } from "@/recoil/atoms";
import { useResetRecoilState } from "recoil";

type Props = {
  isGuest: boolean;
};
export default function LogoutButton({ isGuest = false }: Props) {
  const resetMyCurrentDeckID = useResetRecoilState(myCurrentDeckIDState);
  //TODO: delete guest account after signing out
  return (
    <form action={signOutAction}>
      <button
        className={cn(
          "py-1 px-2 rounded no-underline text-slate-200 bg-blue-800 hover:bg-blue-700 ",
          isGuest && "bg-red-700 hover:bg-red-600"
        )}
        onClick={(e) => {
          e.preventDefault();
          resetMyCurrentDeckID();
          e.currentTarget.form?.requestSubmit();
        }}
      >
        {isGuest ? "Delete guest account" : "Logout"}
      </button>
    </form>
  );
}
