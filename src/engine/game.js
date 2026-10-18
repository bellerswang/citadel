import {
    INITIAL_STATE,
    HAND_SIZE,
    produce,
    canAfford,
    isUndiscardable,
    playCardOnState,
    checkWinner,
} from './engine.js';

let uidCounter = 0;
const nextUid = () => `card-${++uidCounter}`;

export const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const shuffleInPlace = (array, rng) => {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const createDeck = (cards, rng = Math.random) => {
    const deck = [];
    for (const card of cards) {
        deck.push({ ...card, uid: nextUid() });
        deck.push({ ...card, uid: nextUid() });
    }
    return shuffleInPlace(deck, rng);
};

export const drawCard = (deck, cards, rng = Math.random) => {
    let current = deck;

    if (!current || current.length === 0) {
        current = createDeck(cards, rng);
    }

    if (current.length === 0) {
        return { card: undefined, deck: current };
    }

    const [card, ...rest] = current;
    return { card, deck: rest };
};

export const discardRandomForEffect = (hand, rng = Math.random) => {
    const indices = [];

    for (let i = 0; i < hand.length; i += 1) {
        if (!isUndiscardable(hand[i])) indices.push(i);
    }

    if (indices.length === 0) {
        return { hand, discarded: null };
    }

    const index = indices[Math.floor(rng() * indices.length)];

    return {
        hand: [...hand.slice(0, index), ...hand.slice(index + 1)],
        discarded: hand[index],
    };
};

export const chooseActionFirst = (hand, self, _enemy) => {
    const playable = hand.find((card) => canAfford(card, self));
    if (playable) return { type: 'play', card: playable };

    const discardable = hand.find((card) => !isUndiscardable(card));
    return { type: 'discard', card: discardable || hand[0] };
};

const productionTotal = (state) => state.quarries + state.magic + state.dungeon;
const resourceTotal = (state) => state.bricks + state.gems + state.beasts;

export const chooseActionGreedy = (hand, self, enemy) => {
    const affordable = hand.filter((card) => canAfford(card, self));

    if (affordable.length === 0) {
        const discardable = hand.filter((card) => !isUndiscardable(card));

        if (discardable.length === 0) {
            return { type: 'discard', card: hand[0] };
        }

        const card = discardable.reduce(
            (best, current) => ((current.cost ?? 0) > (best.cost ?? 0) ? current : best),
            discardable[0],
        );

        return { type: 'discard', card };
    }

    let bestCard = affordable[0];
    let bestScore = -Infinity;

    for (const card of affordable) {
        const result = playCardOnState(card, { player: self, enemy }, 'player');
        const nextSelf = result.player;
        const nextEnemy = result.enemy;

        let score =
            (nextSelf.tower - nextEnemy.tower) * 1 +
            (nextSelf.wall - nextEnemy.wall) * 0.5 +
            (productionTotal(nextSelf) - productionTotal(nextEnemy)) * 4 +
            0.15 * (resourceTotal(nextSelf) - resourceTotal(nextEnemy));

        const winner = checkWinner(nextSelf, nextEnemy);
        if (winner?.winner === 'PLAYER') score += 1000;
        else if (winner?.winner === 'ENEMY') score -= 1000;

        if (result.playAgain) score += 2;

        if (score > bestScore) {
            bestScore = score;
            bestCard = card;
        }
    }

    return { type: 'play', card: bestCard };
};

const removeCardFromHand = (hand, card) => {
    const index = hand.findIndex(
        (candidate) => candidate === card || (card?.uid && candidate.uid === card.uid),
    );

    if (index === -1) return hand;
    return [...hand.slice(0, index), ...hand.slice(index + 1)];
};

const bump = (map, key) => {
    map[key] = (map[key] || 0) + 1;
};

export const simulateGame = ({
    cards,
    rng = Math.random,
    policies = {},
    maxTurns = 2000,
    first = 'player',
} = {}) => {
    const playerPolicy = policies.player || chooseActionFirst;
    const enemyPolicy = policies.enemy || chooseActionFirst;

    let deck = createDeck(cards, rng);
    const hands = { player: [], enemy: [] };

    const drawOne = () => {
        const result = drawCard(deck, cards, rng);
        deck = result.deck;
        return result.card;
    };

    for (let i = 0; i < HAND_SIZE; i += 1) {
        const playerCard = drawOne();
        if (playerCard) hands.player.push(playerCard);

        const enemyCard = drawOne();
        if (enemyCard) hands.enemy.push(enemyCard);
    }

    const states = {
        player: { ...INITIAL_STATE },
        enemy: { ...INITIAL_STATE },
    };

    const plays = {};
    const playsByPlayer = {};
    const playsByEnemy = {};

    let discards = 0;
    let deadHands = 0;
    let winnerInfo = null;
    let active = first;
    let turns = 1;
    let needProduction = true;

    const maxActions = Math.max(maxTurns * 20, 10000);
    let actionCount = 0;

    while (turns <= maxTurns && actionCount < maxActions) {
        actionCount += 1;

        if (needProduction) {
            states[active] = produce(states[active]);
        }

        const other = active === 'player' ? 'enemy' : 'player';
        const hand = hands[active];

        if (!hand.some((card) => canAfford(card, states[active]))) {
            deadHands += 1;
        }

        const policy = active === 'player' ? playerPolicy : enemyPolicy;
        const action = policy(hand, states[active], states[other]);

        let playAgain = false;

        if (action?.type === 'play' && action.card) {
            const card = action.card;

            hands[active] = removeCardFromHand(hands[active], card);

            const replacement = drawOne();
            if (replacement) hands[active] = [...hands[active], replacement];

            const result = playCardOnState(card, states, active);
            states.player = result.player;
            states.enemy = result.enemy;

            plays[card.id] ??= { player: 0, enemy: 0 };
            plays[card.id][active] += 1;
            bump(active === 'player' ? playsByPlayer : playsByEnemy, card.id);

            if (result.drawDiscard) {
                const extra = drawOne();
                if (extra) hands[active] = [...hands[active], extra];

                const discarded = discardRandomForEffect(hands[active], rng);
                hands[active] = discarded.hand;
                if (discarded.discarded) discards += 1;
            }

            playAgain = Boolean(result.playAgain);
        } else {
            const card = action?.card ?? hands[active][0];

            if (card) {
                hands[active] = removeCardFromHand(hands[active], card);

                const replacement = drawOne();
                if (replacement) hands[active] = [...hands[active], replacement];

                discards += 1;
            }

            playAgain = false;
        }

        winnerInfo = checkWinner(states.player, states.enemy);
        if (winnerInfo) break;

        if (playAgain) {
            needProduction = false;
        } else {
            active = other;
            turns += 1;
            needProduction = true;
        }
    }

    const winner = winnerInfo?.winner ?? null;
    const reason = winnerInfo?.reason ?? null;

    let playsByWinner = {};
    let playsByLoser = {};

    if (winner === 'PLAYER') {
        playsByWinner = playsByPlayer;
        playsByLoser = playsByEnemy;
    } else if (winner === 'ENEMY') {
        playsByWinner = playsByEnemy;
        playsByLoser = playsByPlayer;
    }

    return {
        winner,
        reason,
        turns: Math.min(turns, maxTurns),
        first,
        plays,
        playsByWinner,
        playsByLoser,
        discards,
        deadHands,
        final: {
            player: states.player,
            enemy: states.enemy,
        },
    };
};

export const simulateMany = ({
    cards,
    games,
    seed = 1,
    policies = {},
    alternateFirst = true,
} = {}) => {
    const playerPolicy = policies.player || chooseActionFirst;
    const enemyPolicy = policies.enemy || chooseActionFirst;
    const totalGames = Math.max(0, Math.floor(Number(games) || 0));
    const baseSeed = Number(seed) || 0;

    let playerWins = 0;
    let enemyWins = 0;
    let firstWins = 0;
    let secondWins = 0;
    const winsByFirst = { player: 0, enemy: 0 };
    const firstGames = { player: 0, enemy: 0 };

    let totalTurns = 0;
    let minTurns = Infinity;
    let maxTurns = 0;

    let totalDeadHands = 0;
    let maxDeadHands = 0;
    let gamesWithDeadHands = 0;
    let totalDiscards = 0;

    const reasons = {
        tower: 0,
        destruction: 0,
        timeout: 0,
    };

    const turnHistogram = {
        '1-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
        '100+': 0,
    };

    const cardStats = new Map();

    for (const card of cards) {
        if (!cardStats.has(card.id)) {
            cardStats.set(card.id, {
                id: card.id,
                name: card.name || card.id,
                played: 0,
                winnerPlays: 0,
                loserPlays: 0,
            });
        }
    }

    for (let i = 0; i < totalGames; i += 1) {
        const first = alternateFirst ? (i % 2 === 0 ? 'player' : 'enemy') : 'player';
        const rng = mulberry32(baseSeed + i);

        const result = simulateGame({
            cards,
            rng,
            policies: {
                player: playerPolicy,
                enemy: enemyPolicy,
            },
            first,
        });

        if (result.winner === 'PLAYER') playerWins += 1;
        else if (result.winner === 'ENEMY') enemyWins += 1;

        firstGames[first] += 1;

        if (result.winner) {
            const firstWinner = first === 'player' ? 'PLAYER' : 'ENEMY';

            if (result.winner === firstWinner) {
                firstWins += 1;
                winsByFirst[first] += 1;
            } else {
                secondWins += 1;
            }
        }

        totalTurns += result.turns;
        if (result.turns < minTurns) minTurns = result.turns;
        if (result.turns > maxTurns) maxTurns = result.turns;

        if (result.turns <= 20) turnHistogram['1-20'] += 1;
        else if (result.turns <= 40) turnHistogram['21-40'] += 1;
        else if (result.turns <= 60) turnHistogram['41-60'] += 1;
        else if (result.turns <= 80) turnHistogram['61-80'] += 1;
        else if (result.turns <= 100) turnHistogram['81-100'] += 1;
        else turnHistogram['100+'] += 1;

        totalDeadHands += result.deadHands;
        if (result.deadHands > 0) gamesWithDeadHands += 1;
        if (result.deadHands > maxDeadHands) maxDeadHands = result.deadHands;
        totalDiscards += result.discards;

        if (result.winner === 'PLAYER' || result.winner === 'ENEMY') {
            if (result.reason === 'tower') reasons.tower += 1;
            else if (result.reason === 'destruction') reasons.destruction += 1;
        } else {
            reasons.timeout += 1;
        }

        for (const [id, counts] of Object.entries(result.plays)) {
            let stat = cardStats.get(id);

            if (!stat) {
                stat = {
                    id,
                    name: id,
                    played: 0,
                    winnerPlays: 0,
                    loserPlays: 0,
                };
                cardStats.set(id, stat);
            }

            stat.played += counts.player + counts.enemy;
        }

        for (const [id, count] of Object.entries(result.playsByWinner)) {
            const stat = cardStats.get(id);
            if (stat) stat.winnerPlays += count;
        }

        for (const [id, count] of Object.entries(result.playsByLoser)) {
            const stat = cardStats.get(id);
            if (stat) stat.loserPlays += count;
        }
    }

    const cardList = Array.from(cardStats.values()).map((stat) => {
        const decisivePlays = stat.winnerPlays + stat.loserPlays;

        return {
            ...stat,
            decisivePlays,
            winRateWhenPlayed: decisivePlays > 0 ? stat.winnerPlays / decisivePlays : 0,
        };
    });

    const timeoutCount = reasons.timeout;

    return {
        games: totalGames,
        wins: {
            player: playerWins,
            enemy: enemyWins,
        },
        playerWins,
        enemyWins,
        draws: timeoutCount,
        timeouts: timeoutCount,
        firstWins,
        secondWins,
        firstWinRate: totalGames > 0 ? firstWins / totalGames : 0,
        winsByFirst,
        firstGames,
        avgTurns: totalGames > 0 ? totalTurns / totalGames : 0,
        minTurns: totalGames > 0 ? minTurns : 0,
        maxTurns,
        turnHistogram,
        histogram: turnHistogram,
        reasons,
        deadHands: totalDeadHands,
        totalDeadHands,
        gamesWithDeadHands,
        maxDeadHands,
        deadHandRate: totalGames > 0 ? gamesWithDeadHands / totalGames : 0,
        avgDeadHandsPerGame: totalGames > 0 ? totalDeadHands / totalGames : 0,
        discards: totalDiscards,
        totalDiscards,
        cards: cardList,
        perCard: cardList,
    };
};
