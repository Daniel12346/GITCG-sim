"use client";
import Card from "@/components/Card";
import CardDisplay from "@/components/CardDisplay";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { cardFromBasicInfo } from "../utils";
const DeckDisplayNoSSR = dynamic(() => import("@/components/DeckDisplay"), {
  ssr: false,
});
const DeckInfoNoSSR = dynamic(() => import("@/components/DeckInfo"), {
  ssr: false,
});

export default function DeckBuilder() {
  const client = createClientComponentClient<Database>();
  const [searchKey, setSearchKey] = useState("");
  const [searchResultCards, setSearchResultCards] = useState<CardExt[]>([]);
  useEffect(() => {
    const getCardsBasicInfo = async () => {
      const result = await client
        .from("card_basic_info")
        .select("*, effect_basic_info(*)")
        .ilike("name", `%${searchKey}%`);
      result.error && console.log(result.error);
      const cardsBasicInfo = result.data;
      const cards = cardsBasicInfo?.map((cardBasicInfo) => {
        return cardFromBasicInfo(cardBasicInfo);
      });
      cards && setSearchResultCards(cards);
    };
    if (!searchKey.trim()) {
      setSearchResultCards([]);
      return;
    }
    getCardsBasicInfo();
  }, [searchKey]);

  return (
    <div className="pt-12 flex flex-col text-slate-200 md:max-w-6xl w-full md:grid md:grid-cols-[6fr_3fr_3fr] gap-6">
      <Suspense fallback={<div>Loading deck...</div>}>
        <div className="col-span-3">
          <DeckInfoNoSSR />
        </div>
        <div>
          <DeckDisplayNoSSR />
        </div>
        <div className="border-x-2 md:border-indigo-400 flex flex-col px-4 gap-3">
          <span className="text-lg text-slate-200">Add cards to deck</span>
          <div className="text-slate-300">
            <label>Card name</label>
            <input
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              className="px-1 mb-3 bg-indigo-100 text-indigo-950"
            ></input>
            <div className="flex flex-wrap px-2 justify-evenly gap-3 overflow-y-scroll max-h-[25rem]">
              {searchResultCards.map((card) => {
                return <Card key={card.id} card={card} isInDeckDisplay />;
              })}
            </div>
          </div>
        </div>
        <div>
          <CardDisplay />
        </div>
      </Suspense>
    </div>
  );
}
