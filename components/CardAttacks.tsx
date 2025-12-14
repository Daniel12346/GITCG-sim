import {
  broadcastSwitchPlayer,
  calculateTotalDice,
  findCostModifyingEffectsWithCardIDs,
} from "@/app/utils";
import {
  myIDState,
  currentPlayerIDState,
  opponentIDState,
  opponentInGameCardsState,
  myInGameCardsState,
  myDiceState,
  mySelectedDiceState,
  opponentDiceState,
  mySelectedCardsState,
  playerErrorMessageState,
  currentActiveCharacterAttacksState,
  usedAttackState,
  isOpponentReadyForNextPhaseState,
  opponentCharacterChangesAfterAttackState,
  currentRoundState,
  summonsState,
} from "@/recoil/atoms";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useState } from "react";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";
import CardAttack from "./CardAttack";
import { findEffectLogic } from "@/app/cardEffects";
import { subtractCost, activateEffect } from "@/app/gameActions";
import { CardExtended } from "@/app/global";

export default function CardAttacks({ playerID }: { playerID: string }) {
  const myID = useRecoilValue(myIDState);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
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
  const attacks = useRecoilValue(currentActiveCharacterAttacksState);
  const [usedAttack, setUsedAttack] = useRecoilState(usedAttackState);
  const isOpponentReadyForNextPhase = useRecoilValue(
    isOpponentReadyForNextPhaseState
  );

  const setOpponentCharacterChangesAfterAttack = useSetRecoilState(
    opponentCharacterChangesAfterAttackState
  );
  const activateAttackEffect = (attackEffect: Effect) => {
    if (!myCards) return;
    const attackerCard = myCards.find((c) => c.id === attackEffect.card_id);
    if (attackEffect.effectType === "ELEMENTAL_BURST") {
      if (!attackerCard) {
        return { errorMessage: "No attacker card found" };
      }
      if (attackerCard.location !== "CHARACTER") {
        return { errorMessage: "Effect card not a character" };
      }
      if (attackerCard.energy !== attackerCard.max_energy) {
        setErrorMessage("Not enough energy");
        return;
      }
    }
    const opponentCharactersBeforeAttack = opponentInGameCards.filter(
      (c) => c.location === "CHARACTER"
    );
    //the target of the attack is the opponent's active character
    const opponentActiveCharacter = opponentCharactersBeforeAttack.find(
      (c) => c.is_active
    );
    if (!opponentActiveCharacter) {
      return { errorMessage: "No target found" };
    }

    //attack effects have a cost
    let cost =
      attackEffect.cost &&
      Object.fromEntries(
        Object.entries(attackEffect.cost).filter(([key]) => key != "ENERGY")
      );
    let myDiceAfterCost = myDice;
    let myUpdatedCards = myCards;
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
          effect,
          playerID: myID,
          myCards: myUpdatedCards,
          myDice,
          thisCardID: cardID,
          opponentCards: opponentInGameCards,
          opponentDice: opponentDice,
          triggerContext: {
            eventType: "ATTACK",
            cost,
            attack: {
              //damageDealt is not needed here because cost is paid before the attack is executed
              attackerCard,
              attackBaseEffectID: attackEffect.effect_basic_info_id,
            },
          },
          currentRound,
        });

        if (errorMessage) {
          return { errorMessage };
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
          return { errorMessage: "Incorrect number of dice" };
        }
        //subtracting the cost from the selected dice to check if the dice are correct
        subtractCost(mySelectedDice, cost);
      } catch (e) {
        return { errorMessage: "Incorrect dice" };
      }
      //if there are enough dice, subtract the selected dice from the total dice
      try {
        myDiceAfterCost = subtractCost(myDice, mySelectedDice);
      } catch (e) {
        return { errorMessage: "Not enough total dice" };
      }
    }
    //execute the attack effect
    let {
      myUpdatedCards: myUpdatedCardsAfterAttackEffect,
      myUpdatedDice,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
      modifiedDamage,
    } = activateEffect({
      thisCardID: attackerCard!.id,
      playerID: myID,
      effect: attackEffect,
      myCards: myUpdatedCards,
      summons,
      myDice: myDiceAfterCost,
      opponentCards: opponentInGameCards,
      opponentDice: opponentDice,
      targetCards: [opponentActiveCharacter],
      currentRound,
    });
    if (myUpdatedCardsAfterAttackEffect) {
      myUpdatedCards = myUpdatedCardsAfterAttackEffect;
    }
    if (errorMessage) {
      return { errorMessage };
    }
    if (attackEffect.effectType === "ELEMENTAL_BURST") {
      if (myUpdatedCards) {
        //setting the energy of the character to 0 after using the burst (burst attacks use energy)
        myUpdatedCards = myUpdatedCards.map((c) => {
          if (c.id === attackerCard!.id) {
            return {
              ...c,
              energy: 0,
            };
          }
          return c;
        }) as CardExtended[];
      }
    }
    const opponentCharactersAfterAttack = opponentUpdatedCards?.filter(
      (c) => c.location === "CHARACTER"
    );
    const opponentCharactersHealthAndStatusChanges =
      opponentCharactersAfterAttack?.reduce<CardStatChange[]>((acc, card) => {
        const cardBeforeAttack = opponentCharactersBeforeAttack.find(
          (c) => c.id === card.id
        );
        if (!cardBeforeAttack) return acc;
        const healthChange = card.health! - cardBeforeAttack.health!;
        const statusesAdded = card.statuses?.filter(
          (status) =>
            !cardBeforeAttack.statuses?.find((s) => s.name === status.name)
        );
        const statusesRemoved = cardBeforeAttack.statuses?.filter(
          (status) => !card.statuses?.find((s) => s.name === status.name)
        );
        if (
          healthChange !== 0 ||
          statusesAdded?.length ||
          statusesRemoved?.length
        ) {
          acc.push({
            cardID: card.id,
            healthChange,
            statusesAdded,
            statusesRemoved,
          });
        }
        return acc;
      }, []);

    return {
      myUpdatedCards,
      myUpdatedDice: myUpdatedDice || myDiceAfterCost,
      opponentUpdatedCards,
      opponentUpdatedDice,
      errorMessage,
      attackerCard,
      targetCard: opponentActiveCharacter,
      modifiedDamage,
      opponentCharacterChanges: opponentCharactersHealthAndStatusChanges,
    };
  };

  return (
    <div className="flex justify-between overflow-hidden px-4 items-center absolute h-full bottom-[-4px] w-fit right-2">
      {isMyBoard && (
        <>
          {
            /* sort so the attack with effect type NORMAL_ATTACK is first, ELEMENTAL_SKILL is second and ELEMENTAL_BURST is last */
            attacks?.length &&
              attacks
                ?.toSorted((a: Effect, b: Effect) => {
                  const order = [
                    "NORMAL_ATTACK",
                    "ELEMENTAL_SKILL",
                    "ELEMENTAL_BURST",
                  ];
                  return (
                    order.indexOf(a.effectType!) - order.indexOf(b.effectType!)
                  );
                })
                ?.map((attack) => (
                  <CardAttack
                    key={attack.id}
                    playerID={playerID}
                    attack={attack}
                    handleMouseEnter={() => {
                      const res = activateAttackEffect(attack);
                      console.log(res);
                      if (!res) return;
                      const { opponentCharacterChanges } = res;

                      opponentCharacterChanges &&
                        setOpponentCharacterChangesAfterAttack(
                          opponentCharacterChanges
                        );
                    }}
                    handleMouseLeave={() => {
                      setOpponentCharacterChangesAfterAttack(null);
                    }}
                    handleAttack={() => {
                      const res = activateAttackEffect(attack);
                      if (res) {
                        const {
                          myUpdatedCards,
                          myUpdatedDice,
                          opponentUpdatedCards,
                          opponentUpdatedDice,
                          errorMessage,
                          targetCard,
                        } = res;
                        if (errorMessage) {
                          setErrorMessage(errorMessage);
                          return;
                        }
                        if (attack.effect_basic_info_id) {
                          setUsedAttack({
                            attackerCardID: attack.card_id ?? null,
                            targetCardID: targetCard?.id || null,
                            attackEffectBaseID: attack.effect_basic_info_id,
                          });
                          setTimeout(() => {
                            setUsedAttack(null);
                          }, 1500);
                        }
                        myUpdatedCards && setMyCards(myUpdatedCards);
                        myUpdatedDice && setMyDice(myUpdatedDice);
                        opponentUpdatedCards &&
                          setOpponentInGameCards(opponentUpdatedCards);
                        opponentUpdatedDice &&
                          setOpponentDice(opponentUpdatedDice);
                        setSelectedTargets([]);
                        const opponentsActiveCharacterIsDefeated =
                          opponentUpdatedCards?.find(
                            (c) =>
                              c.location === "CHARACTER" &&
                              c.is_active &&
                              c.health === 0
                          );
                        channel
                          ?.send({
                            type: "broadcast",
                            event: "updated_cards_and_dice",
                            payload: {
                              myCards: myUpdatedCards,
                              myDice: myUpdatedDice,
                              opponentCards: opponentUpdatedCards,
                              opponentDice: opponentUpdatedDice,
                              usedAttack: {
                                attackerCardID: attack.card_id,
                                targetCardID: targetCard?.id || null,
                                attackEffectBaseID: attack.effect_basic_info_id,
                              },
                            },
                          })
                          .then(() => {
                            setMySelectedDice({});
                            //passing the turn to the opponent
                            //the attacker continues their turn if the attack was a fast action or if the opponent finished their actions for the phase
                            if (
                              !isOpponentReadyForNextPhase ||
                              //if the opponent's active character was defeated, they switch to another character, even if they have finished their actions in this phase
                              //TODO: make switching mandatory when the opponent's active character is defeated
                              opponentsActiveCharacterIsDefeated
                            ) {
                              setCurrentPlayerID(opponentID);
                              broadcastSwitchPlayer({
                                channel,
                                playerID: opponentID,
                              });
                            }
                          });
                      }
                    }}
                  />
                ))
          }
        </>
      )}
    </div>
  );
}
