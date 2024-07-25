type Props = {
  attack: Effect;
  playerID: string;
  handleAttack: () => void;
};

export default function CardAttackInfo({
  attack,
  playerID,
  handleAttack,
}: Props) {
  return (
    <div className=" bg-blue-300 cursor-pointer z-20" onClick={handleAttack}>
      {/* <p className="text-xs">{attack.description}</p> */}
      <div className="h-full">
        {Object.entries(attack.cost!)
          .sort()
          .map(([element, amount]) => (
            <div key={element + playerID}>
              <span>
                {element}:{amount}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
