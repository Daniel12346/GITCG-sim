import { myIDState, myProfileState, mySessionState } from "@/recoil/atoms";
import { use, useEffect } from "react";
import { useRecoilState } from "recoil";
import {
  SupabaseClient,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";

const useMySession = () => {
  const [mySession, setMySession] = useRecoilState(mySessionState);
  const supabase = createClientComponentClient<any>();

  useEffect(() => {
    const fetchMySessionData = async () => {
      console.log("supabase", supabase);
      const { data, error } = await supabase.auth.getSession();
      console.log("data", data);
      console.log("error", error);
      if (!data.session) {
        //TODO: handle this
      }
      if (error) {
        console.log("error", error);
        return;
      }
      const session = data?.session;
      session && setMySession(session);
    };
    fetchMySessionData();
  }, [supabase]);
  return mySession;
};
// export const use= () => {

//     if (!myID){
//         const mySessionData = await fetchMySessionData();
//         mySessionData&&setMySessionID(mySessionData.id)
//     }
//     return myID
// }

// export const useProfileData = () => {
//     const [myProfile, setMySessionID] = useRecoilState(myProfileState)

//     useEffect(() => {

//     })}
// }
export { useMySession };
