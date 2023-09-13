export const dynamic = "force-dynamic";
import BattleIcon from "@/public/swords_icon1.svg";
import Image from "next/image";

export default async function Index() {
  return (
    <div className="flex w-full">
      <div className="flex justify-center w-full">
        <div className="uppercase flex justify-evenly md:flex-row flex-col text-amber-200 text-xl font-light">
          <div className="flex flex-col gap-3 items-center">
            <Image
              className="h-1/2"
              src="deck_icon1.svg"
              alt="battle icon"
              width={200}
              height={200}
            />
            <span className="text-center">deck builder</span>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Image
              className="h-1/2"
              src="swords_icon1.svg"
              alt="battle icon"
              width={200}
              height={200}
            />
            <span className="text-center">match</span>
          </div>
        </div>
      </div>
    </div>
  );
}
