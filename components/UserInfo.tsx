"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import UserDecks from "./UserDecks";

export default function UserInfo() {
  const supabase = createClientComponentClient<Database>();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userInfo, setUserInfo] = useState<any>();

  useEffect(() => {
    const getUserIdFromSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setUserId(data?.session?.user?.id);
    };
    getUserIdFromSession();
  }, [supabase, setUserId]),
    useEffect(() => {
      const getUserInfo = async () => {
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
    <pre>
      {JSON.stringify(userInfo, null, 2)}
      <div>DECKS: {userId && <UserDecks userId={userId} />}</div>
    </pre>
  );
}
