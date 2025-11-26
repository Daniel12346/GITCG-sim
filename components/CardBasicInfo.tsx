"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function CardBasicInfo() {
  const supabase = createClient();

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
