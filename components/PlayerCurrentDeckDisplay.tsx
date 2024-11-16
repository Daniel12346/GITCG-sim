import { userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState } from "@/recoil/atoms";
import DeckDisplay from "./DeckDisplay";
import { useRecoilValue } from "recoil";

type Props = {
  playerID: string;
};
export default function PlayerCurrentDeckDisplay({ playerID }: Props) {
  const userCurrentDeckCardsWithQuantitiesAndEffects = useRecoilValue(
    userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState(playerID)
  );

  return userCurrentDeckCardsWithQuantitiesAndEffects ? (
    <DeckDisplay deckCards={userCurrentDeckCardsWithQuantitiesAndEffects} />
  ) : null;
}
