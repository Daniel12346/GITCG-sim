//TODO:
export default function CreationDisplay({
  creationCardBasicInfoId,
  isMyBoard,
}: {
  creationCardBasicInfoId: string;
  isMyBoard: boolean;
}) {}

type CreationDisplays = {
  [key: string]: {
    shouldDisplayOnCard({
      card,
      thisCreation,
    }: {
      card: CardExt;
      thisCreation: CardExt;
    }): boolean;
    displayComponent({
      card,
      thisCreation,
    }: {
      card: CardExt;
      thisCreation: CardExt;
    }): React.JSX.Element | null;
  };
};
//TODO: rename
export const creationDisplays: CreationDisplays = {
  "529ec9d6-67ed-430a-acc2-22219f0880ef": {
    shouldDisplayOnCard: ({ thisCreation, card }) => {
      return (card && card.location === "CHARACTER" && card.is_active) ?? false;
    },
    displayComponent: ({ thisCreation, card }) => {
      const { usages, max_usages } = thisCreation;
      if (!max_usages || usages === null) return null;
      const remaininguUsages = max_usages - usages;
      return (
        <div>
          {Array.from({ length: remaininguUsages }, (_, i) => (
            <div key={i} className="">
              {<div>🧊</div>}
            </div>
          ))}
        </div>
      );
    },
  },
};

const getCreationDisplay = (creationCardBasicInfoId: string) => {
  return creationDisplays[creationCardBasicInfoId];
};

export const getCreationDisplayComponentForCard = ({
  creations,
  card,
}: {
  creations: CardExt[];
  card: CardExt;
}) => {
  const creationDisplays =
    creations &&
    creations
      .filter((creation) => {
        const creationDisplay = getCreationDisplay(creation.card_basic_info_id);
        const shouldDisplay = creationDisplay?.shouldDisplayOnCard({
          card,
          thisCreation: creation,
        });
        return shouldDisplay;
      })
      .map((creation) => {
        const creationDisplay = getCreationDisplay(creation.card_basic_info_id);
        const shouldDisplay = creationDisplay?.shouldDisplayOnCard({
          card,
          thisCreation: creation,
        });
        if (!creationDisplay || !shouldDisplay) return null;
        return creationDisplay.displayComponent({
          card,
          thisCreation: creation,
        });
      });
  return creationDisplays;
};
