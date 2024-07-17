import {
  amSelectingTargetsState,
  requiredTargetsState,
  currentEffectState,
  targetingPurposeState,
} from "@/recoil/atoms";
import { useRecoilState, useSetRecoilState } from "recoil";

type Props = {
  attack: Effect;
  playerID: string;
};

export default function CardAttackInfo({ attack, playerID }: Props) {
  const [amSelectingTargets, setAmSelectingTargets] = useRecoilState(
    amSelectingTargetsState
  );
  const setRequiredTargets = useSetRecoilState(requiredTargetsState);
  const setCurrentEffect = useSetRecoilState(currentEffectState);
  const setTargetingPurpose = useSetRecoilState(targetingPurposeState);

  return (
    <div
      className=" bg-blue-300 cursor-pointer z-20"
      onClick={() => {
        if (attack.requiredTargets && !amSelectingTargets) {
          setRequiredTargets(attack.requiredTargets);
          setCurrentEffect(attack);
          setTargetingPurpose("ATTACK");
          setAmSelectingTargets(true);
          return;
        }
      }}
    >
      {/* <p className="text-xs">{attack.description}</p> */}
      <div className="h-full">
        {Object.entries(attack.cost!)
          .sort()
          .map(([element, amount]) => (
            <div>
              <span key={element + playerID}>
                {element}:{amount}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
