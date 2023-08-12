import { cookies } from "next/headers";
import { useState, useEffect } from "react";
import CardBaseInfoDisplay from "@/components/CardBasicInfo";

export const dynamic = "force-dynamic";

export default async function Index() {
  return (
    <div className="w-full flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm text-foreground">
          <div />
          <CardBaseInfoDisplay></CardBaseInfoDisplay>
        </div>
      </nav>
    </div>
  );
}
