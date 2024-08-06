import MyID from "@/components/MyID";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
const MyIDNoSSR = dynamic(() => import("@/components/MyID"), {
  ssr: false,
});

export default async function Index() {
  return (
    <div className="flex w-full flex-col pt-12">
      <MyIDNoSSR />
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
