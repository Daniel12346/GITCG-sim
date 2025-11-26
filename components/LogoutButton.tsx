"use client";
import { signOutAction } from "@/app/actions";
import { myCurrentDeckIDState } from "@/recoil/atoms";
import { useResetRecoilState } from "recoil";

export default function LogoutButton() {
  const resetMyCurrentDeckID = useResetRecoilState(myCurrentDeckIDState);
  return (
    <form action={signOutAction}>
      <button
        className="py-1 px-2 rounded no-underline text-slate-200 bg-blue-800 hover:bg-blue-700 "
        onClick={(e) => {
          e.preventDefault();
          resetMyCurrentDeckID();
          e.currentTarget.form?.requestSubmit();
        }}
      >
        Logout
      </button>
    </form>
  );
}
