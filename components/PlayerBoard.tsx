import {
  currentGameIDState,
  currentPlayerIDState,
  myIDState,
  opponentIDState,
  opponentInGameCardsState,
  myDiceState,
  opponentDiceState,
  mySelectedCardsState,
  myInGameCardsState,
  mySelectedDiceState,
  summonsState,
  currentRoundState,
  isMyTurnState,
  currentPhaseState,
  playerErrorMessageState,
  currentHighlightedCardState,
  usedAttackState,
  opponentProfileState,
  myProfileState,
  isOpponentReadyForNextPhaseState,
  amIReadyForNextPhaseState,
  isCardViewOpenState,
} from "@/recoil/atoms";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useEffect, useState } from "react";
import CardInGame from "./CardInGame";
import { RealtimeChannel } from "@supabase/supabase-js";
import { subtractCost, switchActiveCharacterCard } from "@/app/gameActions";
import { CardExtended, CostT } from "@/app/global";
import {
  broadcastSwitchPlayer,
  subtractCostAfterModifiers,
  calculateTotalDice,
  findCostModifyingEffectsWithCardIDs,
  findEffectsThatTriggerOnWithCardIDs,
  findEquippedCards,
} from "@/app/utils";
import DiceDisplay from "./DiceDisplay";
import { findEffectLogic } from "@/app/cardEffects";
import { getCreationDisplayComponentForCard } from "./CreationDisplay";
import DiceReroll from "./DiceReroll";
import CardRedraw from "./CardRedraw";
import GameOver from "./GameOver";
import PlayerBannerInGame from "./PlayerBannerInGame";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import CardAttacks from "./CardAttacks";
import PlayerErrorDisplay from "./PlayerErrorDisplay";
import CurrentViewedCard from "./CurrentViewedCard";
import { XIcon } from "lucide-react";

interface PlayerBoardProps {
  playerID?: string;
}
interface UpdatedCardsAndDicePayload {
  myCards?: CardExtended[];
  opponentCards?: CardExtended[];
  myDice?: Dice;
  opponentDice?: Dice;
  highlightedCard?: CardExtended;
  usedAttack?: Attack;
}
export default function PlayerBoard({ playerID }: PlayerBoardProps) {
  const gameID = useRecoilValue(currentGameIDState);
  const myID = useRecoilValue(myIDState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const currentPhase = useRecoilValue(currentPhaseState);
  const [currentPlayerID, setCurrentPlayerID] =
    useRecoilState(currentPlayerIDState);
  const opponentID = useRecoilValue(opponentIDState);
  const [opponentInGameCards, setOpponentInGameCards] = useRecoilState(
    opponentInGameCardsState
  );
  const [myCards, setMyCards] = useRecoilState(myInGameCardsState);
  const [myDice, setMyDice] = useRecoilState(myDiceState);
  const [mySelectedDice, setMySelectedDice] =
    useRecoilState(mySelectedDiceState);
  const [opponentDice, setOpponentDice] = useRecoilState(opponentDiceState);

  const [selectedTargetCards, setSelectedTargets] =
    useRecoilState(mySelectedCardsState);

  const summons = useRecoilValue(summonsState);

  const [errorMessage, setErrorMessage] = useRecoilState(
    playerErrorMessageState
  );
  const currentRound = useRecoilValue(currentRoundState);

  const isMyBoard = playerID === myID;
  const playerCards = isMyBoard ? myCards : opponentInGameCards;
  const playerDice = isMyBoard ? myDice : opponentDice;
  const isMyTurn = useRecoilValue(isMyTurnState);
  const cardsInDeck = playerCards.filter((card) => card.location === "DECK");
  const setHighlightedCard = useSetRecoilState(currentHighlightedCardState);
  const [usedAttack, setUsedAttack] = useRecoilState(usedAttackState);
  const myProfile = useRecoilValue(myProfileState);
  const opponentProfile = useRecoilValue(opponentProfileState);
  const playerProfile = isMyBoard ? myProfile : opponentProfile;
  const isOpponentReadyForNextPhase = useRecoilValue(
    isOpponentReadyForNextPhaseState
  );
  const [isCardViewOpen, setIsCardViewOpen] =
    useRecoilState(isCardViewOpenState);

  const amIReadyForNextPhase = useRecoilValue(amIReadyForNextPhaseState);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("game-updates:" + gameID, {
      config: { presence: { key: myID } },
    });
    channel
      .on("broadcast", { event: "switch_player" }, ({ payload }) => {
        const { playerID } = payload;
        setCurrentPlayerID(playerID);
      })
      .on("broadcast", { event: "updated_cards_and_dice" }, ({ payload }) => {
        const {
          myCards,
          opponentCards,
          myDice,
          opponentDice,
          highlightedCard,
          usedAttack,
        } = payload as UpdatedCardsAndDicePayload;
        //the cards the opponent set as "myCards" in the payload become opponentInGameCards from the other player's perspective etc.
        myCards && setOpponentInGameCards(myCards);
        opponentCards && setMyCards(opponentCards);
        myDice && setOpponentDice(myDice);
        opponentDice && setMyDice(opponentDice);
        highlightedCard && setHighlightedCard(highlightedCard);
        if (usedAttack) {
          setUsedAttack(usedAttack);
          setTimeout(() => {
            setUsedAttack(null);
          }, 1500);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            online_at: new Date().toISOString(),
            cards: myCards,
          });
          console.log("player boards", presenceTrackStatus);
        }
      });
    setChannel(channel);
    return () => {
      console.log("unsubscribing in turn and phase");
      setChannel(null);
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!errorMessage) return;
    setTimeout(
      () => {
        setErrorMessage("");
      },
      5000,
      errorMessage
    );
  }, [errorMessage]);
  const handleSwitchCharacter = async (
    newActiveCharacter: CardExt,
    {
      phase,
      amIReadyForNextPhase,
    }: {
      phase: PhaseName | null;
      amIReadyForNextPhase: boolean;
    }
  ) => {
    if (!myCards) return;
    const hasActiveCharacter = myCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    let myUpdatedCards = myCards;
    let opponentUpdatedCards = opponentInGameCards;
    //if there is no active character or the active character was defeated, the card can be switched to active without a cost
    const prevActiveCharacter = myUpdatedCards.find(
      (card) => card.location === "CHARACTER" && card.is_active
    );
    if (!hasActiveCharacter || prevActiveCharacter?.health === 0) {
      myUpdatedCards = myCards.map((c) => {
        if (c.id === newActiveCharacter.id) {
          return { ...c, is_active: true };
        }
        if (c.id === prevActiveCharacter?.id) {
          return { ...c, is_active: false };
        }
        return c;
      }) as CardExtended[];
      await channel?.send({
        type: "broadcast",
        event: "updated_cards_and_dice",
        payload: {
          myCards: myUpdatedCards,
          highlightedCard: newActiveCharacter,
        },
      });
      setHighlightedCard(newActiveCharacter);
      setMyCards(
        (prev) =>
          prev.map((c) => {
            if (c.id === newActiveCharacter.id) {
              return { ...c, is_active: true };
            } else {
              if (c.location === "CHARACTER" && c.is_active) {
                return { ...c, is_active: false };
              }
            }
            return c;
          }) as CardExtended[]
      );
      if (amIReadyForNextPhase && currentPhase === "ACTION_PHASE") {
        //if the player is ready for the next phase, the turn is passed back to the opponent
        setCurrentPlayerID(opponentID);
        channel &&
          broadcastSwitchPlayer({
            channel,
            playerID: opponentID,
          });
      }
    } else {
      //the default cost of switching a character is 1 UNALIGNED die
      if (phase === "PREPARATION_PHASE") {
        setErrorMessage("Cannot switch character in preparation phase");
        return;
      }
      let cost: CostT = { UNALIGNED: 1 };
      const {
        errorMessage,
        myUpdatedCards: myUpdatedCardsAfterSwitch,
        switchedFrom,
        switchedTo,
      } = switchActiveCharacterCard(myCards, newActiveCharacter);

      if (errorMessage) {
        setErrorMessage(errorMessage);
        return;
      }
      if (myUpdatedCardsAfterSwitch) {
        myUpdatedCards = myUpdatedCardsAfterSwitch;
      }

      const effectsThatTriggerOnSwitchWithCardIDs =
        findEffectsThatTriggerOnWithCardIDs(
          "SWITCH_CHARACTER",
          myUpdatedCards,
          {
            includeCostModifiers: true,
          }
        );
      //switching character is not a fast action by default
      let isSwitchFastAction = false;
      if (switchedFrom?.health === 0) {
        //switching from a defeated character is a fast action
        isSwitchFastAction = true;
      }
      effectsThatTriggerOnSwitchWithCardIDs.forEach(({ effect, cardID }) => {
        const effectLogic = findEffectLogic(effect);
        if (!effectLogic?.execute) return;
        const {
          myUpdatedCards: myUpdatedCardsAfterEffectsTriggeredOnSwitch,
          opponentUpdatedCards:
            opponentUpdatedCardsAfterEffectsTriggeredOnSwitch,
          modifiedCost,
          errorMessage,
          isFastAction,
        } = effectLogic.execute({
          effect,
          thisCardID: cardID,
          playerID: myID,
          myCards: myUpdatedCards || myCards,
          myDice,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          summons,
          triggerContext: {
            eventType: "SWITCH_CHARACTER",
            cost,
            switched: {
              from: switchedFrom,
              to: switchedTo,
            },
          },
          currentRound,
        });
        if (errorMessage) {
          setErrorMessage(errorMessage);
          return;
        }
        if (modifiedCost) {
          cost = modifiedCost;
        }
        if (myUpdatedCardsAfterEffectsTriggeredOnSwitch) {
          myUpdatedCards = myUpdatedCardsAfterEffectsTriggeredOnSwitch;
        }
        if (opponentUpdatedCardsAfterEffectsTriggeredOnSwitch) {
          opponentUpdatedCards =
            opponentUpdatedCardsAfterEffectsTriggeredOnSwitch;
        }
        if (isFastAction !== undefined) {
          isSwitchFastAction = isFastAction;
        }
      });
      if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
        setErrorMessage("Incorrect number of dice");
        return;
      }
      let diceAfterCost;
      try {
        diceAfterCost = subtractCost(myDice, cost);
        setMyDice(diceAfterCost);
        setMySelectedDice({});
      } catch (e) {
        setErrorMessage("Not enough dice");
        return;
      }
      myUpdatedCards && setMyCards(myUpdatedCards);
      opponentUpdatedCards && setOpponentInGameCards(opponentUpdatedCards);
      setHighlightedCard(newActiveCharacter);
      channel
        ?.send({
          type: "broadcast",
          event: "updated_cards_and_dice",
          payload: {
            highlightedCard: newActiveCharacter,
            myCards: myUpdatedCards,
            myDice: diceAfterCost,
            opponentCards: opponentUpdatedCards,
          },
        })
        .then(() => {
          //passing the turn to the opponent if the switch was not a fast action
          if (!isSwitchFastAction && !isOpponentReadyForNextPhase) {
            setCurrentPlayerID(opponentID);
            broadcastSwitchPlayer({
              channel,
              playerID: opponentID,
            });
          }
        });
    }
  };

  const activateCard = (card: CardExt) => {
    if (!myCards) return;
    //equipment cards are weapon and artifact cards
    const isEquipment = card.subtype?.includes("EQUIPMENT");
    const isFood = card.subtype === "EVENT_FOOD";
    //location and companion cards
    const isSupport = card.subtype?.includes("SUPPORT");
    let myUpdatedCards = myCards;
    let myUpdatedDice = myDice;
    let opponentUpdatedCards = opponentInGameCards;
    let opponentUpdatedDice = opponentDice;
    let thisCardEffectsThatTriggerOnThisCardActivation: Effect[] = [];

    if ((isEquipment || isFood) && selectedTargetCards.length !== 1) {
      setErrorMessage("Incorrect number of targets");
      return;
    }
    if (card.subtype === "EQUIPMENT_ARTIFACT") {
      const selectedTargetCard = selectedTargetCards[0];
      const cardsEquippedToTarget = findEquippedCards(
        selectedTargetCard,
        myUpdatedCards,
        "EQUIPMENT_ARTIFACT"
      );
      if (cardsEquippedToTarget.length == 1) {
        setErrorMessage("Target already has a relic equipped");
        return;
      }
    }
    try {
      thisCardEffectsThatTriggerOnThisCardActivation = card.effects.filter(
        (effect) => {
          const effectLogic = findEffectLogic(effect);
          return effectLogic.triggerOn?.includes("THIS_CARD_ACTIVATION");
        }
      );

      thisCardEffectsThatTriggerOnThisCardActivation.forEach((effect) => {
        const effectLogic = findEffectLogic(effect);
        if (
          effectLogic.requiredTargets &&
          selectedTargetCards.length !== effectLogic.requiredTargets
        ) {
          throw new Error("Incorrect number of targets");
        }
      });
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }

    if (isSupport) {
      const cardToDiscard = selectedTargetCards[0];
      if (myUpdatedCards?.filter((c) => c.location === "ACTION").length >= 4) {
        if (
          selectedTargetCards.length === 1 &&
          cardToDiscard.location === "ACTION" &&
          cardToDiscard.owner_id === myID
        ) {
          myUpdatedCards = myUpdatedCards.map((c) => {
            if (c.id === cardToDiscard.id) {
              return {
                ...c,
                location: "DISCARDED",
              };
            }
            return c;
          });
        } else {
          setErrorMessage("You need to discard a card from the action zone");
          return;
        }
      }
    }

    let cost = card.cost;
    try {
      if (cost) {
        const costModifyingEffectsWithCardIDs =
          findCostModifyingEffectsWithCardIDs(myCards);
        //execute all cost modifying effects
        costModifyingEffectsWithCardIDs.forEach(({ effect, cardID }) => {
          const effectLogic = findEffectLogic(effect);
          if (!effectLogic?.execute) return;
          let {
            modifiedCost,
            errorMessage,
            myUpdatedCards: myUpdatedCardsAfterCostModifyingEffect,
          } = effectLogic.execute({
            summons,
            thisCardID: cardID,
            effect,
            playerID: myID,
            myCards: myUpdatedCards,
            myDice,
            opponentCards: opponentUpdatedCards,
            opponentDice: opponentUpdatedDice,
            targetCards: selectedTargetCards,
            triggerContext: {
              eventType: "CARD_ACTIVATION",
              cost,
              activatedCard: card,
            },
            currentRound,
          });

          if (errorMessage) {
            throw new Error(errorMessage);
          }
          if (myUpdatedCardsAfterCostModifyingEffect) {
            myUpdatedCards = myUpdatedCardsAfterCostModifyingEffect;
          }
          if (modifiedCost) {
            cost = modifiedCost;
          }
        });
        try {
          //checking if there are enough dice among the selected dice
          if (calculateTotalDice(mySelectedDice) !== calculateTotalDice(cost)) {
            throw new Error("Incorrect number of dice");
          }
          //subtracting the cost from the selected dice to check if the dice are correct
          subtractCost(mySelectedDice, cost);
        } catch (e) {
          throw new Error("Incorrect dice");
        }
        //if there are enough dice, subtract the selected dice from the total dice
        try {
          myUpdatedDice = subtractCost(myUpdatedDice, mySelectedDice);
        } catch (e) {
          throw new Error("Not enough total dice");
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }

    if (card.cost) {
      const {
        modifiedCost,
        myUpdatedCards: myUpdatedCardsAfterCostModifiers,
        myUpdatedDice: myUpdatedDiceAfterCostModifiers,
        errorMessage,
      } = subtractCostAfterModifiers({
        baseCost: card.cost,
        selectedDice: mySelectedDice,
        executeArgs: {
          summons,
          playerID: myID,
          myCards: myUpdatedCards,
          myDice,
          opponentCards: opponentUpdatedCards,
          opponentDice: opponentUpdatedDice,
          triggerContext: {
            eventType: "CARD_ACTIVATION",
            cost,
            activatedCard: card,
            targetCards: selectedTargetCards,
          },
          currentRound,
        },
      });
      if (modifiedCost) {
        cost = modifiedCost;
      }
      if (myUpdatedCardsAfterCostModifiers) {
        myUpdatedCards = myUpdatedCardsAfterCostModifiers;
      }
      if (myUpdatedDiceAfterCostModifiers) {
        myUpdatedDice = myUpdatedDiceAfterCostModifiers;
      }
      if (errorMessage) {
        setErrorMessage(errorMessage);
        return;
      }
    }

    myUpdatedCards = myCards.map((c) => {
      if (c.id === card.id) {
        const location: CardExt["location"] = isEquipment
          ? "EQUIPPED"
          : card.subtype === "EVENT_FOOD" || card.subtype === "EVENT_BASIC"
          ? "DISCARDED"
          : "ACTION";
        const equippedTo =
          isEquipment || isFood ? selectedTargetCards[0].id : null;
        // TODO: set wasActivatedThisTurn to false at the end of the turn
        return { ...c, location, wasActivatedThisTurn: true, equippedTo };
      }
      return c;
    });

    const myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs =
      findEffectsThatTriggerOnWithCardIDs(
        "CARD_ACTIVATION",
        myCards,
        //cost modifers will be handled separately before the other effects are executed
        { includeCostModifiers: false }
      );

    try {
      if (
        thisCardEffectsThatTriggerOnThisCardActivation.length !== 0 ||
        myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs.length !== 0
      ) {
        //execute all effects that trigger on this card activation

        [
          ...(thisCardEffectsThatTriggerOnThisCardActivation.map(
            (cardEffect) => ({
              effect: cardEffect,
              cardID: card.id,
            })
          ) || []),
          ...(myOtherCardEffectsThatTriggerOnCardActivationWithCardIDs || []),
        ].forEach(({ effect, cardID }, idx) => {
          const effectLogic = findEffectLogic(effect);
          const eventType =
            idx < thisCardEffectsThatTriggerOnThisCardActivation.length
              ? "THIS_CARD_ACTIVATION"
              : "CARD_ACTIVATION";
          if (!effectLogic.execute) return;

          const {
            myUpdatedCards: myCardsAfterTriggeredEffects,
            myUpdatedDice: myDiceAfterTriggeredEffects,
            opponentUpdatedCards: opponentCardsAfterTriggeredEffects,
            opponentUpdatedDice: opponentDiceAfterTriggeredEffects,
            errorMessage,
          } = effectLogic.execute({
            effect,
            thisCardID: cardID,
            playerID: myID,
            summons,
            myCards: myUpdatedCards,
            myDice: myUpdatedDice,
            opponentCards: opponentInGameCards,
            opponentDice: opponentDice,
            currentRound,
            targetCards: selectedTargetCards,
            triggerContext: {
              eventType,
              cost,
              activatedCard: card,
              targetCards: selectedTargetCards,
            },
          });
          if (errorMessage) {
            setErrorMessage(errorMessage);
            throw new Error(errorMessage);
          }
          myCardsAfterTriggeredEffects &&
            (myUpdatedCards = myCardsAfterTriggeredEffects);
          myDiceAfterTriggeredEffects &&
            (myUpdatedDice = myDiceAfterTriggeredEffects);
          opponentCardsAfterTriggeredEffects &&
            (opponentUpdatedCards = opponentCardsAfterTriggeredEffects);
          opponentDiceAfterTriggeredEffects &&
            (opponentUpdatedDice = opponentDiceAfterTriggeredEffects);
        });
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      return;
    }
    channel?.send({
      type: "broadcast",
      event: "updated_cards_and_dice",
      payload: {
        //the card that was activated is displayed on the opponent's board to highlight its activation
        //only used on cards that were activated from hand
        highlightedCard: card,
        myCards: myUpdatedCards,
        myDice: myUpdatedDice,
        opponentCards: opponentUpdatedCards,
        opponentDice: opponentUpdatedDice,
      },
    });
    setHighlightedCard(card);
    setMyCards(myUpdatedCards);
    setMyDice(myUpdatedDice);
    setOpponentInGameCards(opponentUpdatedCards);
    setOpponentDice(opponentUpdatedDice);
    setSelectedTargets([]);
    setMySelectedDice({});
  };

  return (
    <div
      className={cn(
        "bg-fieldSecondary grid grid-cols-[10%_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_10%] gap-2 w-100% text-slate-100 p-2 overflow-x-hidden border-x-4  transition-colors duration-300",
        isMyBoard && currentPhase === "ACTION_PHASE" && isMyTurn
          ? "border-green-500"
          : "border-red-500"
      )}
    >
      <div
        className={cn(
          `relative
        bg-fieldHand col-span-full h-24 md:h-32 py-2 grid grid-cols-[2fr_10fr_2fr] `,
          isMyBoard && "order-2"
        )}
      >
        <div
          className={`h-full flex ${isMyBoard ? "items-end" : "items-start"}`}
        >
          <PlayerBannerInGame
            playerProfile={playerProfile}
            isMyProfile={isMyBoard}
          />
        </div>
        {/* HAND ZONE */}
        <div className="flex relative flex-row justify-center items-center gap-0.5 md:gap-1">
          {isMyBoard && (
            <div className="absolute w-full top-[-20px] flex justify-center">
              <PlayerErrorDisplay />
            </div>
          )}

          {playerCards
            ?.filter((card) => card.location === "HAND")
            .map((card) => (
              <CardInGame
                key={card.id}
                card={card}
                handleClick={() => activateCard(card)}
              />
            ))}
        </div>
        <div className="hidden md:block">{isMyBoard && <CardAttacks />}</div>
      </div>

      <div
        className={`h-full w-full p-1 flex gap-1 ${
          isMyBoard ? "flex-col" : "flex-col-reverse"
        } justify-center items-center`}
      >
        {/*DECK ZONE*/}
        <div className="relative flex-col items-center">
          {cardsInDeck.length && (
            <CardInGame card={cardsInDeck[0]} overrideIsFaceDown />
          )}
        </div>
        <span className="text-lg font-semibold text-slate-300">
          {cardsInDeck.length}
        </span>
      </div>
      <div className="bg-fieldMain">
        {/* ACTION ZONE */}
        <div className="grid grid-cols-2">
          {playerCards
            ?.filter(
              (card) =>
                card.location === "ACTION" &&
                card.subtype &&
                !card.subtype.includes("EQUIPMENT")
            )
            .map((card) => (
              <CardInGame key={card.id} card={card} />
            ))}
        </div>
      </div>
      <div
        className={`bg-fieldMain h-full flex items-center justify-center  ${
          !isMyBoard && "self-end"
        }`}
      >
        {/* CHARACTER ZONE*/}
        <div className="flex flex-row justify-between md:justify-evenly px-0.5 md:px-2 w-full max-w-md gap-0.5">
          {playerCards
            ?.filter((card) => card.card_type === "CHARACTER")
            .map((card) => {
              const equippedCards = findEquippedCards(card, playerCards);
              const creations = playerCards?.filter(
                (summon) => summon.subtype === "CREATION"
              );
              const creationDisplayElements =
                creations &&
                getCreationDisplayComponentForCard({
                  card,
                  creations,
                });
              return (
                <CardInGame
                  key={card.id}
                  card={card}
                  equippedCards={equippedCards}
                  creationDisplayElements={creationDisplayElements}
                  handleClick={() => {
                    isMyBoard &&
                      handleSwitchCharacter(card, {
                        phase: currentPhase,
                        amIReadyForNextPhase,
                      });
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="bg-fieldMain h-full">
        {/* SUMMON ZONE */}
        {playerCards
          ?.filter((card) => card.location === "SUMMON")
          .map((card) => {
            return <CardInGame key={card.id} card={card} />;
          })}
      </div>
      <div className="h-full">
        <DiceDisplay
          channel={channel}
          dice={playerDice}
          isMyBoard={isMyBoard}
          withElementalTuning
          isMain
        />
      </div>
      {/* DiceReroll, CardRedraw, GameOver and CurrentViewedCard (on small screens)
      should only be displayed on user's board, not the opponent's */}
      {isMyBoard && <DiceReroll channel={channel} />}
      {isMyBoard && <CardRedraw channel={channel} />}
      {isMyBoard && <GameOver />}
      {isMyBoard && (
        <div
          className={cn(
            "md:hidden absolute z-30 left-0 top-0 justify-center w-screen",
            isCardViewOpen ? "flex" : "hidden"
          )}
        >
          <div className="p-2 bg-black/80">
            <span className="md:hidden top-2 right-2">
              <XIcon
                onClick={() => {
                  setIsCardViewOpen(false);
                }}
              />
            </span>
            <CurrentViewedCard />
          </div>
        </div>
      )}
    </div>
  );
}
