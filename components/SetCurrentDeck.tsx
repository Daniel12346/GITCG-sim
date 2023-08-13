import { myCurrentDeckIDState } from "@/recoil/atoms";
import { useSetRecoilState } from "recoil";

interface Props {
  id: string;
}
export default function SetCurrentDeck({ id }: Props) {
  const setMyCurrentDeckID = useSetRecoilState(myCurrentDeckIDState);
  return <button onClick={() => setMyCurrentDeckID(id)}>set active</button>;
}
