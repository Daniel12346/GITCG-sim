import { signInAction } from "../actions";
import Messages from "./messages";
import ReturnHome from "@/components/ReturnHome";

export default function Login() {
  return (
    <div className="flex-1 flex flex-col  w-full px-8 sm:max-w-md justify-center gap-2">
      <ReturnHome />
      <form className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <label className="text-md text-blue-100" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border-2 border-slate-200/40 mb-6 focus:outline-blue-200"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md text-blue-100" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border-2 mb-6 border-slate-200/40 focus:outline-blue-200"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        {/* <button className="bg-green-200 rounded px-4 py-2 text-green-700 font-semibold mb-2">
          Sign In
        </button> */}
        <button
          formAction={signInAction}
          className="border border-gray-700 bg-blue-200 rounded px-4 py-2 text-blue-700 font-semibold mb-2"
        >
          Log in
        </button>
        <Messages />
      </form>
    </div>
  );
}
