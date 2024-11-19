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
  // playerUsername,
  canBeCopied = true,
}: Props) {
  const userCurrentDeckCardsWithQuantitiesAndEffects = useRecoilValue(
    userCurrentDeckCardsBasicInfoWithQuantitiesAndEffectsState(playerID)
  );
  const playerProfile = useRecoilValue(userProfileState(playerID));
  return userCurrentDeckCardsWithQuantitiesAndEffects ? (
    <div>
      {canBeCopied && (
        <div className="flex justify-end">
          <DeckCopyButton
            deckCards={userCurrentDeckCardsWithQuantitiesAndEffects}
            deckName={playerProfile?.username + "'s deck"}
          />
        </div>
      )}
      <DeckDisplay deckCards={userCurrentDeckCardsWithQuantitiesAndEffects} />
    </div>
  ) : null;
}
