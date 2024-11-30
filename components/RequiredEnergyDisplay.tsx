export default function RequiredEnergyDisplay({
  energy,
  energySize = 4,
}: {
  energy: number;
  energySize: number;
}) {
  return (
    <div className="flex items-center">
      {/* <span>energy:</span> */}
      <ul className="flex gap-3">
        {Array.from({
          length: energy,
        }).map((_, i) => (
          <img
            key={"energy" + i}
            src="/energy_icon.svg"
            className={`w-${energySize} h-${energySize}`}
          />
        ))}
      </ul>
    </div>
  );
}
