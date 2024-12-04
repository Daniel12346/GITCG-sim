export default function RequiredEnergyDisplay({
  energy,
  showCurrentEnergy = false,
  currentEnergy,
  energySize = 4,
}: {
  energy: number;
  energySize: number;
  showCurrentEnergy?: boolean;
  currentEnergy?: number;
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
            className={`w-${energySize} h-${energySize} 
            ${
              !showCurrentEnergy || i < (currentEnergy ?? 0)
                ? "opacity-100"
                : "opacity-50 grayscale"
            }`}
          />
        ))}
      </ul>
    </div>
  );
}
