import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import TextWithSlideInUnderline from "@/components/TextWithSlideInUnderline";
import { Loader2 } from "lucide-react";
const MyIDNoSSR = dynamic(() => import("@/components/MyID"), {
  ssr: false,
  loading: () => (
    <div>
      <Loader2 className="ml-4 animate-spin text-yellow-200" size={30} />
    </div>
  ),
});

export default async function Index() {
  return (
    <div className="flex w-full flex-col pt-12">
      <div className="h-12">
        <MyIDNoSSR />
      </div>
      <div className="flex justify-center">
        <h1 className="text-slate-200 font-semibold text-4xl mb-10 text-center">
          Genshin Impact TCG simulator
        </h1>
      </div>
      <div className="flex justify-center w-full">
        <div className="uppercase flex md:flex-row gap-2 md:gap-20 flex-col text-amber-200 text-xl font-light">
          <div className="flex flex-col gap-3 items-center group cursor-pointer">
            <Link
              href="/deck-builder"
              className="flex h-full flex-col gap-3 justify-end items-center"
            >
              <Image
                className="group-hover:scale-105 transition-transform"
                src="deck_icon1.svg"
                alt="battle icon"
                width={100}
                height={100}
              />
              <TextWithSlideInUnderline>deck builder</TextWithSlideInUnderline>
            </Link>
          </div>
          <div className="flex flex-col gap-3 items-center group cursor-pointer">
            <Link href="/lobby" className="flex flex-col gap-3 items-center">
              <Image
                className="flex h-full flex-col gap-3 justify-end items-center group-hover:scale-105 transition-transform"
                src="swords_icon1.svg"
                alt="battle icon"
                width={100}
                height={100}
              />
              <TextWithSlideInUnderline>match</TextWithSlideInUnderline>
            </Link>
          </div>
          <div className="flex h-full  flex-col gap-3 items-center group cursor-pointer">
            <Link
              href="/battle-log"
              className="flex flex-col h-full gap-3 items-center"
            >
              <Image
                className="flex h-full flex-col gap-3 justify-end items-center group-hover:scale-105 transition-transform"
                src="logs_icon.svg"
                alt="logs icon"
                width={100}
                height={100}
              />
              <TextWithSlideInUnderline>battle log</TextWithSlideInUnderline>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
