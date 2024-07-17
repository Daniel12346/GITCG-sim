import {
  amSelectingTargetsState,
  mySelectedTargetCardsState,
  currentEffectState,
  currentlyBeingEquippedState,
  targetingPurposeState,
  requiredTargetsState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue } from "recoil";

interface Props {
  handleEquipCard: (cardToEquip: CardExt, targetCard: CardExt) => void;
  handleUseAttackEffect: (effect: Effect) => void;
  handleActivateEffect: (effect: Effect) => void;
  errorMessage: string | null;
}
export default function TargetSelectionOptions({
  handleEquipCard,
  handleUseAttackEffect,
  handleActivateEffect,
  errorMessage,
}: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const [selectedTargetCards, setSelectedTargets] = useRecoilState(
    mySelectedTargetCardsState
  );
  const [currentEffect, setCurrentEffect] = useRecoilState(currentEffectState);
  const [currentlyBeingEquipped, setCurrentlyBeingEquipped] = useRecoilState(
    currentlyBeingEquippedState
  );
  const [targetingPurpose, setTargetingPurpose] = useRecoilState(
    targetingPurposeState
  );
  const requiredTargets = useRecoilValue(requiredTargetsState);
  return (
    <div>
      <button
        onClick={() => {
          setAmSelectingTargets(false);
          setCurrentEffect(null);
          setCurrentlyBeingEquipped(null);
          setTargetingPurpose(null);
          setSelectedTargets([]);
        }}
        className="bg-orange-300"
      >
        Cancel Selection
      </button>
      <div className="bg-fuchsia-600">
        <button
          className="bg-yellow-200"
          onClick={() => {
            console.log("current effect", currentEffect);
            if (targetingPurpose === "EQUIP" && currentlyBeingEquipped) {
              handleEquipCard(currentlyBeingEquipped, selectedTargetCards[0]);
            } else if (targetingPurpose === "ATTACK" && currentEffect) {
              handleUseAttackEffect(currentEffect);
            } else if (targetingPurpose === "EFFECT" && currentEffect) {
              handleActivateEffect(currentEffect);
            }
          }}
        >
          confirm
        </button>
        {amSelectingTargets && errorMessage && <span>{errorMessage}</span>}
      </div>
      {amSelectingTargets && requiredTargets && (
        <span>{requiredTargets} targets needed</span>
      )}
    </div>
  );
}
