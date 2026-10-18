import { readFileSync } from 'node:fs';
import {
    simulateMany,
    chooseActionFirst,
    chooseActionGreedy,
} from './src/engine/game.js';

const argv = process.argv.slice(2);

let gamesArg = null;
let policyName = 'first';
let seed = 1;
let json = false;

for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--json') {
        json = true;
    } else if (arg.startsWith('--policy=')) {
        policyName = arg.slice('--policy='.length);
    } else if (arg === '--policy' && i + 1 < argv.length) {
        policyName = argv[++i];
    } else if (arg.startsWith('--seed=')) {
        const parsed = Number.parseInt(arg.slice('--seed='.length), 10);
        seed = Number.isFinite(parsed) ? parsed : 1;
    } else if (arg === '--seed' && i + 1 < argv.length) {
        const parsed = Number.parseInt(argv[++i], 10);
        seed = Number.isFinite(parsed) ? parsed : 1;
    } else if (!arg.startsWith('-') && gamesArg === null) {
        gamesArg = arg;
    }
}

const games = (() => {
    const parsed = gamesArg === null ? 1000 : Number.parseInt(gamesArg, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
})();

const policyMap = {
    first: {
        player: chooseActionFirst,
        enemy: chooseActionFirst,
    },
    greedy: {
        player: chooseActionGreedy,
        enemy: chooseActionGreedy,
    },
    mixed: {
        player: chooseActionGreedy,
        enemy: chooseActionFirst,
    },
};

const policies = policyMap[policyName];

if (!policies) {
    console.error(`Unknown policy "${policyName}". Use first, greedy, or mixed.`);
    process.exit(1);
}

const rawCards = JSON.parse(
    readFileSync(new URL('./src/cards.json', import.meta.url), 'utf8'),
);

const cards = Array.isArray(rawCards) ? rawCards : rawCards.cards;

if (!Array.isArray(cards)) {
    console.error('Could not read a card array from ./src/cards.json');
    process.exit(1);
}

if (!json) {
    console.log(`Running ${games} simulated games (policy=${policyName}, seed=${seed})...`);
}

const aggregate = simulateMany({
    cards,
    games,
    seed,
    policies,
    alternateFirst: true,
});

if (json) {
    console.log(JSON.stringify(aggregate, null, 2));
} else {
    printAggregate(aggregate, games);
}

function pct(value, total) {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
}

function printAggregate(agg, totalGames) {
    console.log(`\n=== Results (${totalGames} games) ===`);
    console.log(`Player Wins : ${agg.wins.player}  (${pct(agg.wins.player, totalGames)}%)`);
    console.log(`Enemy Wins  : ${agg.wins.enemy}  (${pct(agg.wins.enemy, totalGames)}%)`);
    console.log(`Draws/Timeouts : ${agg.draws}  (${pct(agg.draws, totalGames)}%)`);

    console.log(`\n--- First Player ---`);
    console.log(`First mover wins : ${agg.firstWins}  (${pct(agg.firstWins, totalGames)}%)`);
    console.log(
        `  Player first : ${agg.winsByFirst.player} / ${agg.firstGames.player}  (${pct(
            agg.winsByFirst.player,
            agg.firstGames.player,
        )}%)`,
    );
    console.log(
        `  Enemy first  : ${agg.winsByFirst.enemy} / ${agg.firstGames.enemy}  (${pct(
            agg.winsByFirst.enemy,
            agg.firstGames.enemy,
        )}%)`,
    );

    console.log(`\n--- Turn Length ---`);
    console.log(`Average turns per game : ${agg.avgTurns.toFixed(1)}`);
    console.log(`Shortest game          : ${agg.minTurns} turns`);
    console.log(`Longest game           : ${agg.maxTurns} turns`);

    console.log(`\n--- Turn Distribution ---`);
    for (const [range, cnt] of Object.entries(agg.turnHistogram)) {
        const bar = '█'.repeat(Math.round((cnt / totalGames) * 40));
        console.log(`  ${range.padEnd(8)} ${String(cnt).padStart(5)} | ${bar}`);
    }

    console.log(`\n--- Win Reasons ---`);
    console.log(`Tower built to 50 : ${agg.reasons.tower}`);
    console.log(`Tower destroyed   : ${agg.reasons.destruction}`);
    console.log(`Timeouts          : ${agg.reasons.timeout}`);

    console.log(`\n--- Dead Hand Analysis ---`);
    console.log(`Total 'Dead Hand' occurrences : ${agg.totalDeadHands}`);
    console.log(`Games with ≥1 Dead Hand       : ${agg.gamesWithDeadHands} / ${totalGames} (${pct(agg.gamesWithDeadHands, totalGames)}%)`);

    const MIN_PLAYS = 30;
    const fmt = (c) => `  ${c.id} ${c.name.padEnd(18)} plays=${String(c.played).padStart(6)}  winRateWhenPlayed=${(c.winRateWhenPlayed * 100).toFixed(1)}%`;
    const qualified = agg.cards.filter((c) => c.decisivePlays >= MIN_PLAYS);
    const byRate = [...qualified].sort((a, b) => b.winRateWhenPlayed - a.winRateWhenPlayed);
    console.log(`\n--- Top 10 cards by win rate when played (min ${MIN_PLAYS} plays) ---`);
    byRate.slice(0, 10).forEach((c) => console.log(fmt(c)));
    console.log(`\n--- Bottom 10 cards by win rate when played ---`);
    byRate.slice(-10).reverse().forEach((c) => console.log(fmt(c)));
    console.log(`\n--- Top 10 most played ---`);
    [...agg.cards].sort((a, b) => b.played - a.played).slice(0, 10).forEach((c) => console.log(fmt(c)));
    const never = agg.cards.filter((c) => c.played === 0);
    console.log(`\n--- Never played (${never.length}) ---`);
    never.forEach((c) => console.log(`  ${c.id} ${c.name}`));
}
