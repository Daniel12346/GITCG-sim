export const dynamic = "force-dynamic";
import BattleIcon from "@/public/swords_icon1.svg";
import Image from "next/image";
import Link from "next/link";

export default async function Index() {
  return (
    <div className="flex w-full flex-col pt-12">
      <div className="flex justify-center">
        <h1 className="text-indigo-200 font-semibold text-3xl mb-10 text-center">
          Genshin Impact TCG simulator
        </h1>
      </div>
      <div className="flex justify-center w-full">
        <div className="uppercase flex justify-evenly md:flex-row flex-col text-amber-200 text-xl font-light">
          <div className="flex flex-col gap-3 items-center group cursor-pointer">
            <Link
              href="/deck-builder"
              className="flex flex-col gap-3 items-center"
            >
              <Image
                className="h-1/2"
                src="deck_icon1.svg"
                alt="battle icon"
                width={200}
                height={200}
              />
              <span className="text-center group-hover:underline">
                deck builder
              </span>
            </Link>
          </div>
          <div className="flex flex-col gap-3 items-center group cursor-pointer">
            <Link href="/lobby" className="flex flex-col gap-3 items-center">
              <Image
                className="h-1/2"
                src="swords_icon1.svg"
                alt="battle icon"
                width={200}
                height={200}
              />
              <span className="text-center group-hover:underline">match</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
