"use client";

// TODO: Duplicate or move this file outside the `_examples` folder to make it a route

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export default function ClientComponent() {
  const supabase = createClientComponentClient<any>();

  const [basicInfo, setBasicInfo] = useState<any>();
  useEffect(() => {
    const getBasicInfo = async () => {
      const { data } = await supabase
        .from("card_basic_info")
        .select("*, effect_basic_info(*)");
      if (data) {
        setBasicInfo(data);
      }
    };

    getBasicInfo();
  }, [supabase, setBasicInfo]);
  return <pre>{JSON.stringify(basicInfo, null, 2)}</pre>;
}
