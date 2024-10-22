export default function LogoutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <button className="py-2 px-3 rounded-sm no-underline text-slate-200 bg-amber-900 hover:bg-amber-800">
        Logout
      </button>
    </form>
  );
}
