import { signOutAction } from "@/app/actions";

export default function LogoutButton() {
  return (
    <form action={signOutAction} method="post">
      <button className="py-1 px-2 rounded no-underline text-slate-200 bg-blue-800 hover:bg-blue-700">
        Logout
      </button>
    </form>
  );
}
