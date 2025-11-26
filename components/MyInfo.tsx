"use client";

import { useEffect, useState } from "react";
import PlayerInfoInGame from "./PlayerBannerInGame";
import { myProfileState } from "@/recoil/atoms";
import { useRecoilValue } from "recoil";
import { createClient } from "@/utils/supabase/client";

export default function MyInfo() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userInfo, setUserInfo] = useState<any>();
  const myProfile = useRecoilValue(myProfileState);

  useEffect(() => {
    const getUserIdFromSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setUserId(data?.session?.user?.id);
    };
    getUserIdFromSession();
  }, [supabase, setUserId]),
    useEffect(() => {
      const getUserInfo = async () => {
        if (!userId) return null;
        const { data } = await supabase
          .from("profile")
          .select("*, deck(*)")
          .eq("id", userId);
        if (data) {
          setUserInfo(data);
        }
      };

      getUserInfo();
    }, [supabase, setUserInfo, userId]);

  return (
    <div>
      {myProfile && (
        <PlayerInfoInGame playerProfile={myProfile}></PlayerInfoInGame>
      )}
    </div>
  );
}
