import Link from "next/link";
import { signUpAction, signUpAsGuestAction } from "../actions";
import Messages from "./messages";

export default function Login() {
  return (
    <div className="flex-1 flex flex-col  w-full px-8 sm:max-w-md justify-center gap-2">
      <form className="flex flex-col w-full justify-center gap-2 text-foreground">
        <span className="self-end text-slate-200/90 underline">
          <Link href="/sign-in">Already have an account? Sign in</Link>
        </span>
        <label className="text-md text-blue-100" htmlFor="email">
          Username
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border-2 border-slate-200/40 mb-6 focus:outline-blue-200"
          name="username"
          required
        />
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
          formAction={signUpAction}
          className="border border-gray-700 bg-blue-200 rounded px-4 py-2 text-blue-700 font-semibold mb-2"
        >
          Sign Up
        </button>

        <Messages />
      </form>
      <form
        action={signUpAsGuestAction}
        className="flex w-full flex-col items-center  border-t-2 border-blue-200 mt-6 "
      >
        <span className="mt-3 mb-3 text-lg text-slate-200">or</span>
        <button
          type="submit"
          className="w-full border border-blue-200  rounded px-4 py-2 text-blue-300 font-semibold mb-2"
        >
          Join as guest
        </button>
      </form>
    </div>
  );
}
