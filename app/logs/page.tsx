import dynamic from "next/dynamic";
const MyIDNoSSR = dynamic(() => import("@/components/MyID"), {
  ssr: false,
});

const BattleLogsNoSSR = dynamic(() => import("@/components/BattleLogs"), {
  ssr: false,
});
export default async function Logs() {
  return (
    <div className="flex w-full flex-col pt-12">
      <MyIDNoSSR />
      <div className="flex justify-center">
        <h2 className="text-slate-300  text-3xl mb-10 text-center">
          Battle history
        </h2>
      </div>
      <div className="flex justify-center w-full">
        <BattleLogsNoSSR />
      </div>
    </div>
  );
}
