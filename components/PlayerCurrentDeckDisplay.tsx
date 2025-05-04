import {
  userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState,
  userProfileState,
} from "@/recoil/atoms";
import DeckDisplay from "./DeckDisplay";
import { useRecoilValue } from "recoil";
import DeckCopyButton from "./DeckCopyButton";

type Props = {
  playerID: string;
  canBeCopied?: boolean;
};
export default function PlayerCurrentDeckDisplay({
  playerID,
  canBeCopied = true,
}: Props) {
  const userCurrentDeckCardsWithQuantitiesAndEffects = useRecoilValue(
    userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState(playerID)
  );
  const playerProfile = useRecoilValue(userProfileState(playerID));
  return userCurrentDeckCardsWithQuantitiesAndEffects ? (
    <div>
      <div className="flex justify-end h-10">
        {canBeCopied && (
          <DeckCopyButton
            deckCards={userCurrentDeckCardsWithQuantitiesAndEffects}
            deckName={playerProfile?.username + "'s deck"}
          />
        )}
      </div>
      <DeckDisplay deckCards={userCurrentDeckCardsWithQuantitiesAndEffects} />
    </div>
  ) : null;
}
