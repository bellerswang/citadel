import { useState, useEffect, useCallback, useRef } from 'react';
import cardsData from './cards.json';

const INITIAL_STATE = { tower: 30, wall: 10, quarries: 2, bricks: 5, magic: 2, gems: 5, dungeon: 2, beasts: 5 };

export const canAfford = (card, state) => {
    if (card.color === 'Red') return state.bricks >= card.cost;
    if (card.color === 'Blue') return state.gems >= card.cost;
    if (card.color === 'Green') return state.beasts >= card.cost;
    return false;
};

export const useGameState = () => {
    const [playerState, setPlayerState] = useState(INITIAL_STATE);
    const [enemyState, setEnemyState] = useState(INITIAL_STATE);
    const [playerHand, setPlayerHand] = useState([]);
    const [enemyHand, setEnemyHand] = useState([]);
    const [deck, setDeck] = useState([]);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [winner, setWinner] = useState(null);
    const [log, setLog] = useState([]);
    const [activeCard, setActiveCard] = useState(null);
    const [isActionPhase, setIsActionPhase] = useState(false);
    const [turnCount, setTurnCount] = useState(1);

    // ─── Refs for always-fresh values inside setTimeout callbacks ─────────────
    // React state inside a closure (e.g. setTimeout) becomes stale after re-renders.
    // We mirror the key pieces of state into refs so the AI always reads current data.
    const enemyHandRef = useRef([]);
    const enemyStateRef = useRef(INITIAL_STATE);
    const deckRef = useRef([]);
    const isActionPhaseRef = useRef(false);
    const isPlayerTurnRef = useRef(true);
    const winnerRef = useRef(null);

    // Keep refs in sync with state every render
    useEffect(() => { enemyHandRef.current = enemyHand; }, [enemyHand]);
    useEffect(() => { enemyStateRef.current = enemyState; }, [enemyState]);
    useEffect(() => { deckRef.current = deck; }, [deck]);
    useEffect(() => { isActionPhaseRef.current = isActionPhase; }, [isActionPhase]);
    useEffect(() => { isPlayerTurnRef.current = isPlayerTurn; }, [isPlayerTurn]);
    useEffect(() => { winnerRef.current = winner; }, [winner]);

    const initDeck = () => {
        let newDeck = [];
        cardsData.forEach(c => {
            for (let i = 0; i < 2; i++) newDeck.push({ ...c, uid: Math.random() });
        });
        return newDeck.sort(() => Math.random() - 0.5);
    };

    const drawCard = (currentDeck) => {
        if (currentDeck.length === 0) currentDeck = initDeck();
        const card = currentDeck[0];
        return { card, newDeck: currentDeck.slice(1) };
    };

    const resetGame = () => {
        const d = initDeck();
        let pHand = [], eHand = [];
        let tempDeck = d;
        for (let i = 0; i < 6; i++) {
            const p = drawCard(tempDeck); pHand.push(p.card); tempDeck = p.newDeck;
            const e = drawCard(tempDeck); eHand.push(e.card); tempDeck = e.newDeck;
        }
        setPlayerState(INITIAL_STATE);
        setEnemyState(INITIAL_STATE);
        setPlayerHand(pHand);
        setEnemyHand(eHand);
        setDeck(tempDeck);
        setWinner(null);
        setLog([{ type: 'start' }]);
        setTurnCount(1);
        setIsPlayerTurn(true);
        setIsActionPhase(false);
    };

    useEffect(() => { resetGame(); }, []);

    const applyEffect = (card, isPlayer) => {
        const setSelf = isPlayer ? setPlayerState : setEnemyState;
        const setOpp = isPlayer ? setEnemyState : setPlayerState;

        // We need snapshot values for conditional logic.
        // Because React state updates are async, we capture them in a local ref via closure.
        // applyEffect is called inside setTimeout, so playerState/enemyState are stale closures
        // unless we read them from a ref. We work around this by chaining setters that receive
        // the latest `s`, and for cross-player conditionals we snapshot at call time.
        const selfSnap = isPlayer ? playerState : enemyState;
        const oppSnap = isPlayer ? enemyState : playerState;

        const e = card.effect.toLowerCase();

        let playAgain = e.includes('play again');

        // ─── HELPER: apply generic wall-first damage to opponent ─────────────
        const dealDamageToOpp = (dmg) => {
            setOpp(s => {
                const excess = dmg - s.wall;
                if (excess > 0) return { ...s, wall: 0, tower: Math.max(0, s.tower - excess) };
                return { ...s, wall: s.wall - dmg };
            });
        };
        const dealDamageToSelf = (dmg) => {
            setSelf(s => {
                const excess = dmg - s.wall;
                if (excess > 0) return { ...s, wall: 0, tower: Math.max(0, s.tower - excess) };
                return { ...s, wall: s.wall - dmg };
            });
        };

        // ─── DAMAGE TO ENEMY TOWER (bypasses wall) ───────────────────────────
        // Must be checked BEFORE generic "damage to enemy" to avoid double-applying.
        const towerDmgMatch = e.match(/(\d+) damage to (?:enemy )?tower/);
        if (towerDmgMatch) {
            const val = parseInt(towerDmgMatch[1]);
            setOpp(s => ({ ...s, tower: Math.max(0, s.tower - val) }));
        }

        // ─── GENERIC DAMAGE (hits wall first, then tower) ────────────────────
        // Patterns: "N damage", "N damage to enemy" (but NOT "to tower" – handled above)
        // Also "N Damage to your Tower" = self tower damage
        const selfTowerDmgMatch = e.match(/(\d+) damage to (?:your )?tower/);
        if (selfTowerDmgMatch && !e.includes('damage to enemy tower')) {
            const val = parseInt(selfTowerDmgMatch[1]);
            setSelf(s => ({ ...s, tower: Math.max(0, s.tower - val) }));
        }

        // Generic "N damage" or "N damage to enemy" (wall-first)
        if (!towerDmgMatch && !selfTowerDmgMatch) {
            const genericDmgMatch = e.match(/(\d+) damage/);
            if (genericDmgMatch) {
                dealDamageToOpp(parseInt(genericDmgMatch[1]));
            }
        } else if (!towerDmgMatch && selfTowerDmgMatch) {
            // if there's ALSO a generic damage component (e.g. "6 Damage ...You take N damage")
            // handled separately below under "you take"
        } else {
            // towerDmgMatch found – check if there's ALSO a generic wall-first damage
            const allDmg = [...e.matchAll(/(\d+) damage/g)].map(m => parseInt(m[1]));
            // towerDmgMatch value is already applied; apply wall-first for any OTHER damage values
            const towerVal = parseInt(towerDmgMatch[1]);
            allDmg.forEach(v => { if (v !== towerVal) dealDamageToOpp(v); });
        }

        // ─── DAMAGE TO ALL TOWERS ─────────────────────────────────────────────
        if (e.includes('damage to all towers') || e.includes('damage to all enemies')) {
            const val = parseInt(e.match(/(\d+) damage/)?.[1] || 0);
            if (val) {
                setOpp(s => ({ ...s, tower: Math.max(0, s.tower - val) }));
                setSelf(s => ({ ...s, tower: Math.max(0, s.tower - val) }));
            }
        }

        // ─── SELF DAMAGE ("you take N damage") ───────────────────────────────
        const youTakeMatch = e.match(/you take (\d+) damage/);
        if (youTakeMatch) dealDamageToSelf(parseInt(youTakeMatch[1]));

        // ─── GAINS: +N stat ───────────────────────────────────────────────────
        // Handles "+1 Tower", "+3 Wall", "+2 Quarry", "+1 Magic", "+1 Dungeon", "+2 recruits"
        const gainMatches = [...e.matchAll(/\+(\d+) (\w+)/g)];
        gainMatches.forEach(m => {
            const val = parseInt(m[1]);
            const stat = m[2];
            if (stat === 'tower') setSelf(s => ({ ...s, tower: s.tower + val }));
            if (stat === 'wall') setSelf(s => ({ ...s, wall: s.wall + val }));
            if (stat === 'quarry') setSelf(s => ({ ...s, quarries: s.quarries + val }));
            if (stat === 'magic') setSelf(s => ({ ...s, magic: s.magic + val }));
            if (stat === 'dungeon') setSelf(s => ({ ...s, dungeon: s.dungeon + val }));
            if (stat === 'recruits' || stat === 'beasts') setSelf(s => ({ ...s, beasts: s.beasts + val }));
            if (stat === 'bricks') setSelf(s => ({ ...s, bricks: s.bricks + val }));
            if (stat === 'gems' || stat === 'gem') setSelf(s => ({ ...s, gems: s.gems + val }));
        });

        // ─── +1 Enemy Tower ───────────────────────────────────────────────────
        const gainEnemyTowerMatch = e.match(/\+(\d+) enemy tower/);
        if (gainEnemyTowerMatch) {
            const val = parseInt(gainEnemyTowerMatch[1]);
            setOpp(s => ({ ...s, tower: s.tower + val }));
        }

        // ─── ALL PLAYERS GAIN quarries ─────────────────────────────────────────
        if (e.includes("+1 to all player's quarry") || e.includes("+1 to all player's quarrys")) {
            setSelf(s => ({ ...s, quarries: s.quarries + 1 }));
            setOpp(s => ({ ...s, quarries: s.quarries + 1 }));
        }
        if (e.includes("+1 to all player's dungeon")) {
            setSelf(s => ({ ...s, dungeon: s.dungeon + 1 }));
            setOpp(s => ({ ...s, dungeon: s.dungeon + 1 }));
        }

        // ─── SELF GAIN: "you gain N gems" / "gain N gems" ────────────────────
        const youGainGemMatch = e.match(/(?:you gain|gain) (\d+) gems/);
        if (youGainGemMatch) {
            const val = parseInt(youGainGemMatch[1]);
            setSelf(s => ({ ...s, gems: s.gems + val }));
        }
        const youGainBrickMatch = e.match(/(?:you gain|gain) (\d+) bricks/);
        if (youGainBrickMatch) {
            const val = parseInt(youGainBrickMatch[1]);
            setSelf(s => ({ ...s, bricks: s.bricks + val }));
        }
        const youGainRecruitMatch = e.match(/(?:you gain|gain) (\d+) recruits/);
        if (youGainRecruitMatch) {
            const val = parseInt(youGainRecruitMatch[1]);
            setSelf(s => ({ ...s, beasts: s.beasts + val }));
        }

        // ─── LOSSES: "you lose N X" ───────────────────────────────────────────
        const youLoseGemMatch = e.match(/you lose (\d+) gems/);
        if (youLoseGemMatch) {
            const val = parseInt(youLoseGemMatch[1]);
            setSelf(s => ({ ...s, gems: Math.max(0, s.gems - val) }));
        }
        const youLoseBrickMatch = e.match(/you lose (\d+) bricks/);
        if (youLoseBrickMatch) {
            const val = parseInt(youLoseBrickMatch[1]);
            setSelf(s => ({ ...s, bricks: Math.max(0, s.bricks - val) }));
        }
        const youLoseRecruitMatch = e.match(/you lose (\d+) recruits/);
        if (youLoseRecruitMatch) {
            const val = parseInt(youLoseRecruitMatch[1]);
            setSelf(s => ({ ...s, beasts: Math.max(0, s.beasts - val) }));
        }
        // "lose N bricks" (without "you", e.g. "Quarry's Help: +7 Tower Lose 10 bricks")
        const loseBrickMatch = e.match(/lose (\d+) bricks/);
        if (loseBrickMatch && !youLoseBrickMatch) {
            const val = parseInt(loseBrickMatch[1]);
            setSelf(s => ({ ...s, bricks: Math.max(0, s.bricks - val) }));
        }
        const loseRecruitMatch = e.match(/lose (\d+) recruits/);
        if (loseRecruitMatch && !youLoseRecruitMatch) {
            const val = parseInt(loseRecruitMatch[1]);
            setSelf(s => ({ ...s, beasts: Math.max(0, s.beasts - val) }));
        }

        // ─── ALL PLAYERS LOSE ─────────────────────────────────────────────────
        if (e.includes("all players lose")) {
            const loseMatch = e.match(/all players lose (\d+) (\w+)/);
            if (loseMatch) {
                const val = parseInt(loseMatch[1]);
                const stat = loseMatch[2];
                const reduceAll = (field) => {
                    setSelf(s => ({ ...s, [field]: Math.max(0, s[field] - val) }));
                    setOpp(s => ({ ...s, [field]: Math.max(0, s[field] - val) }));
                };
                if (stat === 'bricks') reduceAll('bricks');
                if (stat === 'gems') reduceAll('gems');
                if (stat === 'recruits') reduceAll('beasts');
            }
            // "all players lose 5 bricks, gems, and recruits" (Imp card)
            if (e.includes('bricks, gems')) {
                const impMatch = e.match(/lose (\d+) bricks/);
                if (impMatch) {
                    const val = parseInt(impMatch[1]);
                    setSelf(s => ({ ...s, bricks: Math.max(0, s.bricks - val), gems: Math.max(0, s.gems - val), beasts: Math.max(0, s.beasts - val) }));
                    setOpp(s => ({ ...s, bricks: Math.max(0, s.bricks - val), gems: Math.max(0, s.gems - val), beasts: Math.max(0, s.beasts - val) }));
                }
            }
        }

        // ─── SELF QUARRY REDUCE: "-1 Quarry" (e.g. Strip Mine, Earthquake to self) ─
        if (e.match(/-1 quarry(?!\s*[\.,]?\s*\+)/) && !e.includes('enemy quarry') && !e.includes("all player")) {
            setSelf(s => ({ ...s, quarries: Math.max(1, s.quarries - 1) }));
        }

        // ─── ALL PLAYER QUARRIES -1 (Earthquake) ─────────────────────────────
        if (e.includes("-1 to all player's quarry") || e.includes("-1 to all player's quarrys")) {
            setSelf(s => ({ ...s, quarries: Math.max(1, s.quarries - 1) }));
            setOpp(s => ({ ...s, quarries: Math.max(1, s.quarries - 1) }));
        }

        // ─── ENEMY QUARRY -1 (Collapse!, Rock Stompers) ──────────────────────
        if (e.includes('-1 enemy quarry')) {
            setOpp(s => ({ ...s, quarries: Math.max(1, s.quarries - 1) }));
        }

        // ─── ENEMY MAGIC -1 (Shatterer, Discord) ─────────────────────────────
        if (e.match(/-1 magic/) && !e.includes("all player")) {
            setSelf(s => ({ ...s, magic: Math.max(1, s.magic - 1) }));
        }
        if (e.includes("all player's magic -1") || e.includes("all player's magic -1")) {
            setSelf(s => ({ ...s, magic: Math.max(1, s.magic - 1) }));
            setOpp(s => ({ ...s, magic: Math.max(1, s.magic - 1) }));
        }

        // ─── ENEMY LOSES BRICKS / GEMS / RECRUITS ────────────────────────────
        const enemyLoseBrickMatch = e.match(/enemy loses (\d+) bricks/);
        if (enemyLoseBrickMatch) {
            const val = parseInt(enemyLoseBrickMatch[1]);
            setOpp(s => ({ ...s, bricks: Math.max(0, s.bricks - val) }));
        }
        const enemyLoseGemMatch = e.match(/enemy loses (\d+) gems/);
        if (enemyLoseGemMatch) {
            const val = parseInt(enemyLoseGemMatch[1]);
            setOpp(s => ({ ...s, gems: Math.max(0, s.gems - val) }));
        }
        const enemyLoseRecruitMatch = e.match(/enemy loses (\d+) recruits/);
        if (enemyLoseRecruitMatch) {
            const val = parseInt(enemyLoseRecruitMatch[1]);
            setOpp(s => ({ ...s, beasts: Math.max(0, s.beasts - val) }));
        }
        const enemyLoseDungeonMatch = e.match(/-1 enemy dungeon/);
        if (enemyLoseDungeonMatch) {
            setOpp(s => ({ ...s, dungeon: Math.max(1, s.dungeon - 1) }));
        }

        // ─── ALL WALLS TAKE N DAMAGE (Tremors) ───────────────────────────────
        if (e.includes('all walls take')) {
            const val = parseInt(e.match(/(\d+) damage/)?.[1] || 0);
            if (val) {
                setSelf(s => ({ ...s, wall: Math.max(0, s.wall - val) }));
                setOpp(s => ({ ...s, wall: Math.max(0, s.wall - val) }));
            }
        }

        // ─── CONDITIONAL EFFECTS ─────────────────────────────────────────────

        // Mother Lode: "if quarry < enemy quarry, +2 quarry. else, +1 quarry"
        if (e.includes('if quarry < enemy quarry') && e.includes('+2 quarry')) {
            setSelf(_ => (_ => ({
                ..._,
                quarries: _.quarries < oppSnap.quarries ? _.quarries + 2 : _.quarries + 1
            }))(_));
        }

        // CoppingtheTech: "if quarry < enemy quarry, quarry = enemy quarry"
        if (e.includes('quarry = enemy quarry')) {
            if (selfSnap.quarries < oppSnap.quarries) {
                setSelf(s => ({ ...s, quarries: oppSnap.quarries }));
            }
        }

        // Foundations: "if wall = 0, +6 wall, else +3 wall"
        if (e.includes('if wall = 0')) {
            setSelf(s => ({ ...s, wall: s.wall === 0 ? s.wall + 6 : s.wall + 3 }));
        }

        // Bag of Baubles: "if tower < enemy tower +2 tower, else +1 tower"
        if (e.includes('if tower < enemy tower')) {
            setSelf(s => ({ ...s, tower: s.tower + (selfSnap.tower < oppSnap.tower ? 2 : 1) }));
        }

        // Spizzer: "if enemy wall = 0, 10 damage, else 6 damage"
        if (e.includes('if enemy wall = 0')) {
            const dmg = oppSnap.wall === 0 ? 10 : 6;
            dealDamageToOpp(dmg);
        }

        // Corrosion Cloud: "if enemy wall > 0, 10 damage, else 7 damage"
        if (e.includes('if enemy wall > 0')) {
            const dmg = oppSnap.wall > 0 ? 10 : 7;
            dealDamageToOpp(dmg);
        }

        // Unicorn: "if magic > enemy magic, 12 damage, else 8 damage"
        if (e.includes('if magic > enemy magic')) {
            const dmg = selfSnap.magic > oppSnap.magic ? 12 : 8;
            dealDamageToOpp(dmg);
        }

        // Elven Archers: "if wall > enemy wall, 6 damage to tower, else 6 damage"
        if (e.includes('if wall > enemy wall')) {
            if (selfSnap.wall > oppSnap.wall) {
                setOpp(s => ({ ...s, tower: Math.max(0, s.tower - 6) }));
            } else {
                dealDamageToOpp(6);
            }
        }

        // Spearman: "if wall > enemy wall do 3 damage else do 2 damage"
        if (e.includes('if wall > enemy wall do')) {
            dealDamageToOpp(selfSnap.wall > oppSnap.wall ? 3 : 2);
        }

        // Lightning Shard: "if tower > enemy wall, 8 damage to enemy tower, else 8 damage"
        if (e.includes('if tower > enemy wall')) {
            if (selfSnap.tower > oppSnap.wall) {
                setOpp(s => ({ ...s, tower: Math.max(0, s.tower - 8) }));
            } else {
                dealDamageToOpp(8);
            }
        }

        // Thief: "enemy loses 10 gems, 5 bricks, you gain 1/2 amt. round up"
        if (e.includes('you gain 1/2 amt')) {
            const gemsLost = Math.min(10, oppSnap.gems);
            const bricksLost = Math.min(5, oppSnap.bricks);
            setOpp(s => ({ ...s, gems: Math.max(0, s.gems - 10), bricks: Math.max(0, s.bricks - 5) }));
            setSelf(s => ({ ...s, gems: s.gems + Math.ceil(gemsLost / 2), bricks: s.bricks + Math.ceil(bricksLost / 2) }));
        }

        // Shift: "switch your wall with enemy wall"
        if (e.includes('switch your wall with enemy wall')) {
            const myWall = selfSnap.wall;
            const theirWall = oppSnap.wall;
            setSelf(s => ({ ...s, wall: theirWall }));
            setOpp(s => ({ ...s, wall: myWall }));
        }

        // Parity: "all player's magic equals the highest player's magic"
        if (e.includes("all player's magic equals")) {
            const highest = Math.max(selfSnap.magic, oppSnap.magic);
            setSelf(s => ({ ...s, magic: highest }));
            setOpp(s => ({ ...s, magic: highest }));
        }

        // Discord: "7 damage to all towers, all player's magic -1" – already handled
        // by the "damage to all towers" block above.
        if (e.includes("all player") && e.includes("magic -1")) {
            setSelf(s => ({ ...s, magic: Math.max(1, s.magic - 1) }));
            setOpp(s => ({ ...s, magic: Math.max(1, s.magic - 1) }));
        }

        return playAgain;
    };


    const playCard = (card, isPlayer) => {
        if (winner || isActionPhase) return;
        if (isPlayer && !canAfford(card, playerState)) {
            setLog(prev => [{ type: 'not_enough', card, isPlayer }, ...prev]);
            return;
        }

        setIsActionPhase(true);
        setLog(prev => [{ type: 'played', card, isPlayer }, ...prev]);
        setActiveCard(card);

        setTimeout(() => {
            setActiveCard(null);
            const autoPlayAgain = applyEffect(card, isPlayer);

            const cost = card.cost;
            if (isPlayer) {
                setPlayerState(s => {
                    const next = { ...s };
                    if (card.color === 'Red') next.bricks -= cost;
                    if (card.color === 'Blue') next.gems -= cost;
                    if (card.color === 'Green') next.beasts -= cost;
                    return next;
                });
                setPlayerHand(h => h.filter(c => c.uid !== card.uid));
                const { card: nextC, newDeck } = drawCard(deck);
                setPlayerHand(prev => [...prev, nextC]);
                setDeck(newDeck);
            } else {
                setEnemyState(s => {
                    const next = { ...s };
                    if (card.color === 'Red') next.bricks -= cost;
                    if (card.color === 'Blue') next.gems -= cost;
                    if (card.color === 'Green') next.beasts -= cost;
                    return next;
                });
                setEnemyHand(h => h.filter(c => c.uid !== card.uid));
                const { card: nextC, newDeck } = drawCard(deck);
                setEnemyHand(prev => [...prev, nextC]);
                setDeck(newDeck);
            }

            // VFX Timing Delay: Wait 1200ms to let damage slashes, shakes, and
            // screen flashes complete before allowing the next turn.
            setTimeout(() => {
                if (!autoPlayAgain) {
                    if (!isPlayer) setTurnCount(prev => prev + 1);
                    setIsPlayerTurn(!isPlayer);
                } else {
                    setLog(prev => [{ type: 'play_again', isPlayer }, ...prev]);
                    // If it's the enemy's play-again, schedule next AI turn
                    if (!isPlayer) {
                        setTimeout(() => {
                            if (isPlayerTurnRef.current || isActionPhaseRef.current || winnerRef.current) return;
                            const hand = enemyHandRef.current;
                            const state = enemyStateRef.current;
                            const playable = hand.filter(c => canAfford(c, state));
                            if (playable.length > 0) playCardRef.current(playable[0], false);
                            else if (hand.length > 0) discardCardRef.current(hand[0], false);
                        }, 1200);
                    }
                }

                setIsActionPhase(false);
            }, 1200);

        }, 1000);
    };

    const discardCard = (card, isPlayer) => {
        if (winner || isActionPhase) return;

        setIsActionPhase(true);
        setLog(prev => [{ type: 'discarded', card, isPlayer }, ...prev]);
        setActiveCard(card);

        setTimeout(() => {
            setActiveCard(null);

            if (isPlayer) {
                setPlayerHand(h => h.filter(c => c.uid !== card.uid));
                const { card: nextC, newDeck } = drawCard(deck);
                setPlayerHand(prev => [...prev, nextC]);
                setDeck(newDeck);
            } else {
                setEnemyHand(h => h.filter(c => c.uid !== card.uid));
                const { card: nextC, newDeck } = drawCard(deck);
                setEnemyHand(prev => [...prev, nextC]);
                setDeck(newDeck);
            }

            // Discard doesn't trigger complex VFX, but we add a small delay anyway for flow
            setTimeout(() => {
                if (!isPlayer) setTurnCount(prev => prev + 1);
                setIsPlayerTurn(!isPlayer);
                setIsActionPhase(false);
            }, 600);
        }, 1000);
    };

    // Production and Win Condition
    useEffect(() => {
        if (playerState.tower >= 50 || enemyState.tower <= 0) setWinner('PLAYER');
        if (enemyState.tower >= 50 || playerState.tower <= 0) setWinner('ENEMY');
    }, [playerState, enemyState]);

    useEffect(() => {
        if (!winner) {
            if (isPlayerTurn) {
                setPlayerState(s => ({ ...s, bricks: s.bricks + s.quarries, gems: s.gems + s.magic, beasts: s.beasts + s.dungeon }));
            } else {
                setEnemyState(s => ({ ...s, bricks: s.bricks + s.quarries, gems: s.gems + s.magic, beasts: s.beasts + s.dungeon }));
                // AI turn — reads from refs so it always sees the latest hand/state
                // even after multiple React renders have occurred during the delay.
                setTimeout(() => {
                    if (isPlayerTurnRef.current || isActionPhaseRef.current || winnerRef.current) return;
                    const hand = enemyHandRef.current;
                    const state = enemyStateRef.current;
                    const playable = hand.filter(c => canAfford(c, state));
                    if (playable.length > 0) playCardRef.current(playable[0], false);
                    else if (hand.length > 0) discardCardRef.current(hand[0], false);
                }, 1500);
            }
        }
    }, [isPlayerTurn, winner]);

    // ─── Stable refs for playCard / discardCard so setTimeout callbacks ────────
    // can always call the latest version of these functions.
    const playCardRef = useRef(null);
    const discardCardRef = useRef(null);
    playCardRef.current = playCard;
    discardCardRef.current = discardCard;

    const runAutoplay = (count) => {
        // Run synchronously to stress test
        // Caution: This is a heavy blocking operation for the browser thread
        // For 50 games it should take ~50-100ms.
        let winsState = { p: 0, e: 0, turns: 0 };
        for (let i = 0; i < count; i++) {
            let pState = { ...INITIAL_STATE };
            let eState = { ...INITIAL_STATE };
            let currentDeck = [...cardsData.map(c => ({ ...c, uid: Math.random() })), ...cardsData.map(c => ({ ...c, uid: Math.random() }))].sort(() => Math.random() - 0.5);
            let pHand = currentDeck.splice(0, 6);
            let eHand = currentDeck.splice(0, 6);
            let isPTurn = true;
            let turns = 0;

            while (pState.tower < 50 && pState.tower > 0 && eState.tower < 50 && eState.tower > 0 && turns < 1000) {
                turns++;
                let activeState = isPTurn ? pState : eState;
                let activeHand = isPTurn ? pHand : eHand;

                activeState.bricks += activeState.quarries;
                activeState.gems += activeState.magic;
                activeState.beasts += activeState.dungeon;

                const playable = activeHand.filter(c => canAfford(c, activeState));
                let playAgain = false;

                if (playable.length > 0) {
                    const c = playable[0];
                    if (c.color === 'Red') activeState.bricks -= c.cost;
                    if (c.color === 'Blue') activeState.gems -= c.cost;
                    if (c.color === 'Green') activeState.beasts -= c.cost;

                    // Simple simulation applyEffect copy
                    const eText = c.effect.toLowerCase();
                    playAgain = eText.includes('play again');
                    const oppState = isPTurn ? eState : pState;
                    const damage = eText.match(/(\d+) damage/);
                    if (damage && !eText.includes('to your tower') && !eText.includes('all')) {
                        let d = parseInt(damage[1]);
                        if (eText.includes('enemy tower')) oppState.tower = Math.max(0, oppState.tower - d);
                        else {
                            let excess = d - oppState.wall;
                            if (excess > 0) { oppState.wall = 0; oppState.tower = Math.max(0, oppState.tower - excess); }
                            else oppState.wall -= d;
                        }
                    }
                    [...eText.matchAll(/\+(\d+) (\w+)/g)].forEach(m => {
                        const v = parseInt(m[1]), t = m[2];
                        if (t === 'tower') activeState.tower += v;
                        if (t === 'wall') activeState.wall += v;
                        if (t === 'quarry') activeState.quarries += v;
                        if (t === 'magic') activeState.magic += v;
                        if (t === 'dungeon') activeState.dungeon += v;
                    });

                    activeHand.splice(activeHand.indexOf(c), 1);
                    if (currentDeck.length === 0) currentDeck = [...cardsData.map(cd => ({ ...cd, uid: Math.random() }))];
                    activeHand.push(currentDeck.shift());
                } else {
                    activeHand.splice(0, 1);
                    if (currentDeck.length === 0) currentDeck = [...cardsData.map(cd => ({ ...cd, uid: Math.random() }))];
                    activeHand.push(currentDeck.shift());
                }

                if (!playAgain) isPTurn = !isPTurn;
            }
            if (pState.tower >= 50 || eState.tower <= 0) winsState.p++; else winsState.e++;
            winsState.turns += turns;
        }

        console.log(`Autoplay Complete: Player ${winsState.p} - Enemy ${winsState.e}`);
        alert(`Autoplay 50 Complete!\nPlayer Wins: ${winsState.p}\nEnemy Wins: ${winsState.e}\nAvg Turns: ` + (winsState.turns / 50).toFixed(1));
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

    return { playerState, enemyState, playerHand, enemyHand, isPlayerTurn, turnCount, winner, log, playCard, discardCard, resetGame, activeCard, exportDebugLog, isActionPhase, runAutoplay };
};
