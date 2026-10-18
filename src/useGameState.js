import { useState, useEffect, useCallback, useRef } from 'react';
import cardsData from './cards.json';
import {
    INITIAL_STATE, HAND_SIZE, canAfford, applyCardEffect, payCost, produce,
    checkWinner, isUndiscardable, resourceFieldForCard,
} from './engine/engine.js';
import { createDeck, simulateMany, chooseActionFirst, discardRandomForEffect } from './engine/game.js';

export { canAfford };
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const makeId = () => `${Date.now()}-${Math.random()}`;

const RESOURCE_LABELS = { bricks: 'Bricks', gems: 'Gems', beasts: 'Recruits' };
const resourceForCard = (card) => {
    const field = resourceFieldForCard(card);
    return { field, label: field ? RESOURCE_LABELS[field] : '' };
};

const themeForCard = (card) => {
    if (card?.color === 'Red') return 'stone';
    if (card?.color === 'Blue') return 'arcane';
    if (card?.color === 'Green') return 'war';
    return 'neutral';
};

const intensityForText = (text = '') => {
    const values = [...text.matchAll(/\d+/g)].map(match => Number(match[0]));
    const maxValue = values.length ? Math.max(...values) : 0;
    if (maxValue >= 10) return 'heavy';
    if (maxValue >= 4) return 'medium';
    return 'light';
};

const outcomeForCard = (card, isPlayer) => {
    const text = card.effect.toLowerCase();
    const actor = isPlayer ? 'player' : 'enemy';
    const enemy = isPlayer ? 'enemy' : 'player';
    const intensity = intensityForText(text);

    if (text.includes('damage')) {
        return {
            type: 'impact',
            target: { side: text.includes('you take') || text.includes('your tower') ? actor : enemy, part: text.includes('tower') ? 'tower' : 'wall' },
            intensity,
            text: text.includes('tower') ? 'Tower hit' : 'Wall hit'
        };
    }

    if (text.includes('+') && (text.includes('tower') || text.includes('wall'))) {
        return {
            type: 'build',
            target: { side: actor, part: text.includes('tower') ? 'tower' : 'wall' },
            intensity,
            text: text.includes('tower') ? 'Tower rises' : 'Wall rises'
        };
    }

    if (text.includes('lose') || text.includes('gain')) {
        return {
            type: 'resource_pull',
            target: { side: text.includes('enemy loses') ? enemy : actor, part: 'resource' },
            intensity,
            text: 'Resources shift'
        };
    }

    return {
        type: 'impact',
        target: { side: enemy, part: 'field' },
        intensity,
        text: 'Effect lands'
    };
};

export const useGameState = () => {
    const [playerState, setPlayerState] = useState(INITIAL_STATE);
    const [enemyState, setEnemyState] = useState(INITIAL_STATE);
    const [playerHand, setPlayerHand] = useState([]);
    const [enemyHand, setEnemyHand] = useState([]);
    const [deck, setDeck] = useState([]);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [winner, setWinner] = useState(null); // 'PLAYER' or 'ENEMY'
    const [winReason, setWinReason] = useState(null); // 'tower' or 'destruction'
    const [log, setLog] = useState([{ id: 'start', type: 'start' }]);
    const [activeCard, setActiveCard] = useState(null);
    const [isActionPhase, setIsActionPhase] = useState(false);
    const [turnCount, setTurnCount] = useState(1);
    const [phase, setPhase] = useState('idle');
    const [selectedActor, setSelectedActor] = useState('player');
    const [animationEvent, setAnimationEvent] = useState(null);
    const [lastResourceError, setLastResourceError] = useState(null);

    // ─── Refs for always-fresh values inside setTimeout callbacks ─────────────
    // React state inside a closure (e.g. setTimeout) becomes stale after re-renders.
    // We mirror the key pieces of state into refs so the AI always reads current data.
    const enemyHandRef = useRef([]);
    const playerHandRef = useRef([]);
    const enemyStateRef = useRef(INITIAL_STATE);
    const playerStateRef = useRef(INITIAL_STATE);
    const deckRef = useRef([]);
    const isActionPhaseRef = useRef(false);
    const isPlayerTurnRef = useRef(true);
    const winnerRef = useRef(null);

    // Keep refs in sync with state every render
    useEffect(() => { enemyHandRef.current = enemyHand; }, [enemyHand]);
    useEffect(() => { playerHandRef.current = playerHand; }, [playerHand]);
    useEffect(() => { enemyStateRef.current = enemyState; }, [enemyState]);
    useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

    // Board state is written through these helpers so the refs are always current
    // when the engine reads them (effects run inside async/setTimeout chains).
    const commitPlayer = (next) => { playerStateRef.current = next; setPlayerState(next); };
    const commitEnemy = (next) => { enemyStateRef.current = next; setEnemyState(next); };
    const commitStates = (p, e) => { commitPlayer(p); commitEnemy(e); };
    useEffect(() => { deckRef.current = deck; }, [deck]);
    useEffect(() => { isActionPhaseRef.current = isActionPhase; }, [isActionPhase]);
    useEffect(() => { isPlayerTurnRef.current = isPlayerTurn; }, [isPlayerTurn]);
    useEffect(() => { winnerRef.current = winner; }, [winner]);

    const initDeck = () => createDeck(cardsData);

    const drawCard = (currentDeck) => {
        if (currentDeck.length === 0) currentDeck = initDeck();
        const card = currentDeck[0];
        return { card, newDeck: currentDeck.slice(1) };
    };

    const resetGame = () => {
        const d = initDeck();
        let pHand = [], eHand = [];
        let tempDeck = d;
        for (let i = 0; i < HAND_SIZE; i++) {
            const p = drawCard(tempDeck); pHand.push(p.card); tempDeck = p.newDeck;
            const e = drawCard(tempDeck); eHand.push(e.card); tempDeck = e.newDeck;
        }
        commitStates({ ...INITIAL_STATE }, { ...INITIAL_STATE });
        setPlayerHand(pHand);
        setEnemyHand(eHand);
        setDeck(tempDeck);
        setWinner(null);
        setWinReason(null);
        setLog([
            { id: Date.now() + Math.random().toString(), type: 'turn_header', turnCount: 1, isPlayer: true },
            { id: Date.now() + Math.random().toString() + '1', type: 'start' },
        ]);
        setTurnCount(1);
        setIsPlayerTurn(true);
        setIsActionPhase(false);
        setPhase('idle');
        setSelectedActor('player');
        setActiveCard(null);
        setAnimationEvent({ id: makeId(), type: 'reset' });
        setLastResourceError(null);
    };

    useEffect(() => { resetGame(); }, []);

    // All rule logic lives in the shared engine (src/engine). This only commits the result
    // and handles the hand-level side effects (draw/discard) that need React state.
    const applyEffect = (card, isPlayer) => {
        const result = applyCardEffect(
            card,
            { player: playerStateRef.current, enemy: enemyStateRef.current },
            isPlayer ? 'player' : 'enemy'
        );
        commitStates(result.player, result.enemy);

        if (result.drawDiscard) {
            // Prism / Elven Scout: draw 1, then discard 1 random card (never Lodestone).
            const { card: nextC, newDeck } = drawCard(deckRef.current);
            setDeck(newDeck);
            deckRef.current = newDeck;
            const handRef = isPlayer ? playerHandRef : enemyHandRef;
            const setHand = isPlayer ? setPlayerHand : setEnemyHand;
            // The card being played is still in hand at this point (replaceCard removes it
            // afterwards), so it must not be picked as the random discard.
            const withDraw = [...handRef.current, nextC];
            const { discarded } = discardRandomForEffect(withDraw.filter(c => c.uid !== card.uid));
            const hand = discarded ? withDraw.filter(c => c.uid !== discarded.uid) : withDraw;
            handRef.current = hand;
            setHand(hand);
            if (discarded) {
                setLog(l => [{ id: Date.now() + Math.random().toString(), type: 'discarded', card: discarded, isPlayer, isEffect: true }, ...l]);
            }
        }

        return result.playAgain;
    };



    const emitAnimation = (type, payload = {}) => {
        const card = payload.card;
        const actor = payload.actor || (payload.isPlayer === true ? 'player' : payload.isPlayer === false ? 'enemy' : selectedActor);
        setAnimationEvent({
            id: makeId(),
            type,
            actor,
            card,
            theme: payload.theme || themeForCard(card),
            target: payload.target || null,
            intensity: payload.intensity || intensityForText(card?.effect || ''),
            text: payload.text || '',
            ...payload
        });
    };

    const replaceCard = (card, isPlayer) => {
        const { card: nextC, newDeck } = drawCard(deckRef.current);
        const updateHand = (hand) => [...hand.filter(c => c.uid !== card.uid), nextC];

        if (isPlayer) setPlayerHand(updateHand);
        else setEnemyHand(updateHand);
        setDeck(newDeck);
        deckRef.current = newDeck;
        emitAnimation('draw_card', { isPlayer, card: nextC, text: 'Draw' });
    };

    const spendCardCost = (card, isPlayer) => {
        const { field } = resourceForCard(card);
        if (!field) return;
        if (isPlayer) commitPlayer(payCost(card, playerStateRef.current));
        else commitEnemy(payCost(card, enemyStateRef.current));
        emitAnimation('resource_spend', {
            isPlayer,
            card,
            resource: field,
            amount: card.cost,
            target: { side: isPlayer ? 'player' : 'enemy', part: 'resource' },
            text: `-${card.cost}`
        });
    };

    const runAiTurn = async () => {
        if (isPlayerTurnRef.current || isActionPhaseRef.current || winnerRef.current) return;
        setPhase('ai-thinking');
        setSelectedActor('enemy');
        emitAnimation('ai_thinking');
        await wait(650);
        if (isPlayerTurnRef.current || isActionPhaseRef.current || winnerRef.current) return;

        const hand = enemyHandRef.current;
        const state = enemyStateRef.current;
        const playable = hand.filter(c => canAfford(c, state));
        if (playable.length > 0) {
            emitAnimation('ai_select', { card: playable[0], actor: 'enemy', text: 'Enemy chooses' });
            await wait(250);
            playCardRef.current(playable[0], false);
        } else {
            const discardable = hand.filter(c => !isUndiscardable(c));
            const card = discardable[0] || hand[0];
            if (card) {
                emitAnimation('ai_select', { card, actor: 'enemy', text: 'Enemy cycles' });
                await wait(250);
                discardCardRef.current(card, false);
            }
        }
    };

    const endActionSequence = async (isPlayer, playAgain) => {
        if (playAgain) {
            setLog(prev => [{ id: makeId(), type: 'play_again', isPlayer }, ...prev]);
            emitAnimation('play_again', { isPlayer, actor: isPlayer ? 'player' : 'enemy', text: 'Play again' });
            await wait(isPlayer ? 300 : 450);
            setIsActionPhase(false);
            // Update the ref synchronously: runAiTurn() bails out while isActionPhaseRef is true,
            // and the useEffect that syncs it would only run after the next render. Without this
            // the AI froze forever after playing any "play again" card.
            isActionPhaseRef.current = false;
            setPhase('idle');
            if (!isPlayer) runAiTurn();
            return;
        }

        emitAnimation('end_turn', { isPlayer, actor: isPlayer ? 'player' : 'enemy', text: 'End turn' });
        await wait(250);
        if (!isPlayer) setTurnCount(prev => prev + 1);
        setIsPlayerTurn(!isPlayer);
        setIsActionPhase(false);
        setPhase('idle');
    };

    const playCard = async (card, isPlayer) => {
        if (winner || isActionPhase) return;
        const actorState = isPlayer ? playerStateRef.current : enemyStateRef.current;
        const { field, label } = resourceForCard(card);

        if (!canAfford(card, actorState)) {
            const missing = field ? Math.max(0, card.cost - actorState[field]) : 0;
            const error = { id: makeId(), cardUid: card.uid, isPlayer, resource: field, label, missing };
            setLastResourceError(error);
            emitAnimation('resource_error', { ...error, card, target: { side: isPlayer ? 'player' : 'enemy', part: 'resource' }, text: `Need +${missing}` });
            await wait(700);
            setLastResourceError(null);
            return;
        }

        setIsActionPhase(true);
        setPhase('playing');
        setSelectedActor(isPlayer ? 'player' : 'enemy');
        setLastResourceError(null);
        emitAnimation('card_select', { card, isPlayer, text: card.name });
        await wait(80);

        setActiveCard(card);
        setLog(prev => [{ id: makeId(), type: 'played', card, isPlayer }, ...prev]);
        emitAnimation('stage_enter', { card, isPlayer, action: 'play', text: card.name });
        await wait(isPlayer ? 310 : 260);

        if (!isPlayer) {
            emitAnimation('ai_reveal', { card, isPlayer, action: 'play', text: card.name });
            await wait(260);
        }

        emitAnimation('stage_reveal', { card, isPlayer, action: 'play', text: card.effect });
        await wait(340);

        spendCardCost(card, isPlayer);
        await wait(210);

        const outcome = outcomeForCard(card, isPlayer);
        emitAnimation('effect_release', { card, isPlayer, action: 'play', target: outcome.target, intensity: outcome.intensity, text: outcome.text });
        await wait(320);

        const autoPlayAgain = applyEffect(card, isPlayer);
        emitAnimation(outcome.type, { card, isPlayer, action: 'play', target: outcome.target, intensity: outcome.intensity, text: outcome.text });
        await wait(340);

        replaceCard(card, isPlayer);
        await wait(250);

        setActiveCard(null);
        await endActionSequence(isPlayer, autoPlayAgain);
    };

    const discardCard = async (card, isPlayer) => {
        if (winner || isActionPhase) return;

        if (isUndiscardable(card)) {
            const error = { id: makeId(), cardUid: card.uid, isPlayer, reason: 'locked' };
            setLastResourceError(error);
            emitAnimation('discard_denied', { ...error, card, target: { side: isPlayer ? 'player' : 'enemy', part: 'hand' }, text: 'Cannot discard' });
            await wait(700);
            setLastResourceError(null);
            return;
        }

        setIsActionPhase(true);
        setPhase('discarding');
        setSelectedActor(isPlayer ? 'player' : 'enemy');
        emitAnimation('card_select', { card, isPlayer, text: card.name });
        await wait(80);

        setActiveCard(card);
        setLog(prev => [{ id: makeId(), type: 'discarded', card, isPlayer }, ...prev]);
        emitAnimation('stage_enter', { card, isPlayer, action: 'discard', text: card.name });
        await wait(250);

        emitAnimation('card_return', { card, isPlayer, action: 'discard', text: 'Discard' });
        await wait(300);
        replaceCard(card, isPlayer);
        await wait(250);

        setActiveCard(null);
        await endActionSequence(isPlayer, false);
    };

    // Production and Win Condition
    useEffect(() => {
        const result = checkWinner(playerState, enemyState);
        if (result) { setWinner(result.winner); setWinReason(result.reason); }
    }, [playerState, enemyState]);

    useEffect(() => {
        if (!winner) {
            if (isPlayerTurn) {
                commitPlayer(produce(playerStateRef.current));
                // Add a turn header entry each time it becomes the player's turn (skip very first turn, handled in resetGame)
                if (turnCount > 1) {
                    setLog(prev => [{ id: Date.now() + Math.random().toString(), type: 'turn_header', turnCount, isPlayer: true }, ...prev]);
                }
            } else {
                commitEnemy(produce(enemyStateRef.current));
                setLog(prev => [{ id: Date.now() + Math.random().toString(), type: 'turn_header', turnCount, isPlayer: false }, ...prev]);
                runAiTurn();
            }
        }
    }, [isPlayerTurn, winner]);

    // ─── Stable refs for playCard / discardCard so setTimeout callbacks ────────
    // can always call the latest version of these functions.
    const playCardRef = useRef(null);
    const discardCardRef = useRef(null);
    playCardRef.current = playCard;
    discardCardRef.current = discardCard;

    const runAutoplay = (count = 50) => {
        // Uses the same engine as the real game (see simulate.js for the CLI version).
        const agg = simulateMany({
            cards: cardsData,
            games: count,
            seed: Date.now() % 100000,
            policies: { player: chooseActionFirst, enemy: chooseActionFirst },
            alternateFirst: false,
        });
        console.log(`Autoplay Complete: Player ${agg.wins.player} - Enemy ${agg.wins.enemy}`);
        alert(`Autoplay ${count} Complete!\nPlayer Wins: ${agg.wins.player}\nEnemy Wins: ${agg.wins.enemy}\nAvg Turns: ` + agg.avgTurns.toFixed(1));
    };

    const exportDebugLog = () => {
        const debugData = {
            timestamp: new Date().toISOString(),
            playerState,
            enemyState,
            playerHand: playerHand.map(c => c.name),
            enemyHand: enemyHand.map(c => c.name),
            isPlayerTurn,
            winner,
            log
        };
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `citadel_bug_report_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return {
        playerState, enemyState, playerHand, enemyHand,
        isPlayerTurn, turnCount, winner, winReason, log,
        playCard, discardCard, resetGame, activeCard, exportDebugLog,
        isActionPhase, runAutoplay, phase, selectedActor,
        animationEvent, lastResourceError
    };
};
