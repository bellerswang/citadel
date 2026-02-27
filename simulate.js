import fs from 'fs';

const cardsData = JSON.parse(fs.readFileSync('./src/cards.json', 'utf8'));

const INITIAL_STATE = { tower: 30, wall: 10, quarries: 2, bricks: 5, magic: 2, gems: 5, dungeon: 2, beasts: 5 };

const canAfford = (card, state) => {
    if (card.color === 'Red') return state.bricks >= card.cost;
    if (card.color === 'Blue') return state.gems >= card.cost;
    if (card.color === 'Green') return state.beasts >= card.cost;
    return false;
};

// Mirrors the new applyEffect logic from useGameState.js
const applyEffect = (card, playerState, enemyState, isPlayer) => {
    let self = { ...(isPlayer ? playerState : enemyState) };
    let opp = { ...(isPlayer ? enemyState : playerState) };
    const selfSnap = self;
    const oppSnap = opp;

    const e = card.effect.toLowerCase();
    let playAgain = e.includes('play again');

    const dealDmgToOpp = (dmg) => {
        const excess = dmg - opp.wall;
        if (excess > 0) { opp.wall = 0; opp.tower = Math.max(0, opp.tower - excess); }
        else opp.wall -= dmg;
    };
    const dealDmgToSelf = (dmg) => {
        const excess = dmg - self.wall;
        if (excess > 0) { self.wall = 0; self.tower = Math.max(0, self.tower - excess); }
        else self.wall -= dmg;
    };

    // tower-direct damage
    const towerDmgMatch = e.match(/(\d+) damage to (?:enemy )?tower/);
    if (towerDmgMatch) {
        opp.tower = Math.max(0, opp.tower - parseInt(towerDmgMatch[1]));
    }

    // self tower damage
    const selfTowerDmgMatch = e.match(/(\d+) damage to (?:your )?tower/);
    if (selfTowerDmgMatch && !e.includes('damage to enemy tower')) {
        self.tower = Math.max(0, self.tower - parseInt(selfTowerDmgMatch[1]));
    }

    // generic wall-first damage
    if (!towerDmgMatch && !selfTowerDmgMatch) {
        const gd = e.match(/(\d+) damage/);
        if (gd) dealDmgToOpp(parseInt(gd[1]));
    } else if (towerDmgMatch) {
        const allDmg = [...e.matchAll(/(\d+) damage/g)].map(m => parseInt(m[1]));
        const tv = parseInt(towerDmgMatch[1]);
        allDmg.forEach(v => { if (v !== tv) dealDmgToOpp(v); });
    }

    // all towers
    if (e.includes('damage to all towers')) {
        const v = parseInt(e.match(/(\d+) damage/)?.[1] || 0);
        if (v) { opp.tower = Math.max(0, opp.tower - v); self.tower = Math.max(0, self.tower - v); }
    }

    // all walls
    if (e.includes('all walls take')) {
        const v = parseInt(e.match(/(\d+) damage/)?.[1] || 0);
        if (v) { self.wall = Math.max(0, self.wall - v); opp.wall = Math.max(0, opp.wall - v); }
    }

    // you take N damage
    const youTake = e.match(/you take (\d+) damage/);
    if (youTake) dealDmgToSelf(parseInt(youTake[1]));

    // +N stat gains for self
    [...e.matchAll(/\+(\d+) (\w+)/g)].forEach(m => {
        const v = parseInt(m[1]), stat = m[2];
        if (stat === 'tower') self.tower += v;
        if (stat === 'wall') self.wall += v;
        if (stat === 'quarry') self.quarries += v;
        if (stat === 'magic') self.magic += v;
        if (stat === 'dungeon') self.dungeon += v;
        if (stat === 'recruits' || stat === 'beasts') self.beasts += v;
        if (stat === 'bricks') self.bricks += v;
        if (stat === 'gems' || stat === 'gem') self.gems += v;
    });

    // +N enemy tower
    const gainOppTower = e.match(/\+(\d+) enemy tower/);
    if (gainOppTower) opp.tower += parseInt(gainOppTower[1]);

    // you gain / gain N resource
    const youGainGem = e.match(/(?:you gain|gain) (\d+) gems/);
    if (youGainGem) self.gems += parseInt(youGainGem[1]);
    const youGainBrick = e.match(/(?:you gain|gain) (\d+) bricks/);
    if (youGainBrick) self.bricks += parseInt(youGainBrick[1]);
    const youGainRecruit = e.match(/(?:you gain|gain) (\d+) recruits/);
    if (youGainRecruit) self.beasts += parseInt(youGainRecruit[1]);

    // self losses
    const selfLoseGem = e.match(/you lose (\d+) gems/); if (selfLoseGem) self.gems = Math.max(0, self.gems - parseInt(selfLoseGem[1]));
    const selfLoseBrick = e.match(/you lose (\d+) bricks/); if (selfLoseBrick) self.bricks = Math.max(0, self.bricks - parseInt(selfLoseBrick[1]));
    const selfLoseRecruit = e.match(/you lose (\d+) recruits/); if (selfLoseRecruit) self.beasts = Math.max(0, self.beasts - parseInt(selfLoseRecruit[1]));
    const loseBrick = e.match(/lose (\d+) bricks/); if (loseBrick && !selfLoseBrick) self.bricks = Math.max(0, self.bricks - parseInt(loseBrick[1]));
    const loseRecruit = e.match(/lose (\d+) recruits/); if (loseRecruit && !selfLoseRecruit) self.beasts = Math.max(0, self.beasts - parseInt(loseRecruit[1]));

    // enemy losses
    const oppLoseBrick = e.match(/enemy loses (\d+) bricks/); if (oppLoseBrick) opp.bricks = Math.max(0, opp.bricks - parseInt(oppLoseBrick[1]));
    const oppLoseGem = e.match(/enemy loses (\d+) gems/); if (oppLoseGem) opp.gems = Math.max(0, opp.gems - parseInt(oppLoseGem[1]));
    const oppLoseRecruit = e.match(/enemy loses (\d+) recruits/); if (oppLoseRecruit) opp.beasts = Math.max(0, opp.beasts - parseInt(oppLoseRecruit[1]));
    if (e.match(/-1 enemy dungeon/)) opp.dungeon = Math.max(1, opp.dungeon - 1);
    if (e.match(/-1 enemy quarry/)) opp.quarries = Math.max(1, opp.quarries - 1);

    // all players lose
    if (e.includes('all players lose')) {
        const lm = e.match(/all players lose (\d+) (\w+)/);
        if (lm) {
            const v = parseInt(lm[1]), stat = lm[2];
            if (stat === 'bricks') { self.bricks = Math.max(0, self.bricks - v); opp.bricks = Math.max(0, opp.bricks - v); }
            if (stat === 'gems') { self.gems = Math.max(0, self.gems - v); opp.gems = Math.max(0, opp.gems - v); }
            if (stat === 'recruits') { self.beasts = Math.max(0, self.beasts - v); opp.beasts = Math.max(0, opp.beasts - v); }
        }
    }

    // quarries adjustments
    if (e.includes("-1 to all player's quarry") || e.includes("-1 to all player's quarrys")) {
        self.quarries = Math.max(1, self.quarries - 1);
        opp.quarries = Math.max(1, opp.quarries - 1);
    }
    if (e.includes("+1 to all player's quarry") || e.includes("+1 to all player's quarrys")) {
        self.quarries += 1; opp.quarries += 1;
    }
    if (e.match(/-1 quarry/) && !e.includes('enemy quarry') && !e.includes('all player')) {
        self.quarries = Math.max(1, self.quarries - 1);
    }

    // magic adjustments
    if (e.match(/-1 magic/) && !e.includes('all player')) self.magic = Math.max(1, self.magic - 1);
    if (e.includes('all player') && e.includes('magic -1')) {
        self.magic = Math.max(1, self.magic - 1);
        opp.magic = Math.max(1, opp.magic - 1);
    }

    // Conditionals
    if (e.includes('if quarry < enemy quarry') && e.includes('+2 quarry')) {
        self.quarries += self.quarries < oppSnap.quarries ? 2 : 1;
    }
    if (e.includes('quarry = enemy quarry') && self.quarries < oppSnap.quarries) {
        self.quarries = oppSnap.quarries;
    }
    if (e.includes('if wall = 0')) {
        self.wall += self.wall === 0 ? 6 : 3;
    }
    if (e.includes('if tower < enemy tower')) {
        self.tower += self.tower < oppSnap.tower ? 2 : 1;
    }
    if (e.includes('if enemy wall = 0')) {
        dealDmgToOpp(opp.wall === 0 ? 10 : 6);
    }
    if (e.includes('if enemy wall > 0')) {
        dealDmgToOpp(opp.wall > 0 ? 10 : 7);
    }
    if (e.includes('if magic > enemy magic')) {
        dealDmgToOpp(self.magic > oppSnap.magic ? 12 : 8);
    }
    if (e.includes('if wall > enemy wall') && e.includes('damage to tower')) {
        if (self.wall > oppSnap.wall) opp.tower = Math.max(0, opp.tower - 6);
        else dealDmgToOpp(6);
    }
    if (e.includes('if tower > enemy wall')) {
        if (selfSnap.tower > oppSnap.wall) opp.tower = Math.max(0, opp.tower - 8);
        else dealDmgToOpp(8);
    }
    if (e.includes('switch your wall with enemy wall')) {
        const tmp = self.wall; self.wall = opp.wall; opp.wall = tmp;
    }
    if (e.includes("all player's magic equals")) {
        const h = Math.max(self.magic, opp.magic);
        self.magic = h; opp.magic = h;
    }
    if (e.includes('you gain 1/2 amt')) {
        const gl = Math.min(10, opp.gems), bl = Math.min(5, opp.bricks);
        opp.gems = Math.max(0, opp.gems - 10); opp.bricks = Math.max(0, opp.bricks - 5);
        self.gems += Math.ceil(gl / 2); self.bricks += Math.ceil(bl / 2);
    }
    if (e.includes("all player's magic -1") || (e.includes('all player') && e.includes('magic -1'))) {
        self.magic = Math.max(1, self.magic - 1);
        opp.magic = Math.max(1, opp.magic - 1);
    }

    if (isPlayer) return { newPlayerState: self, newEnemyState: opp, playAgain };
    else return { newPlayerState: opp, newEnemyState: self, playAgain };
};

const initDeck = () => {
    let d = [];
    cardsData.forEach(c => { for (let i = 0; i < 2; i++) d.push({ ...c, uid: Math.random() }); });
    return d.sort(() => Math.random() - 0.5);
};

const drawCard = (deck) => {
    if (deck.length === 0) deck = initDeck();
    return { card: deck[0], newDeck: deck.slice(1) };
};

const assertValidState = (state, label) => {
    for (const k of ['tower', 'wall', 'quarries', 'bricks', 'magic', 'gems', 'dungeon', 'beasts']) {
        if (state[k] < 0) throw new Error(`${label} has negative ${k} (${state[k]})`);
        if (isNaN(state[k])) throw new Error(`${label} has NaN ${k}`);
    }
};

const runSimulation = () => {
    let playerState = { ...INITIAL_STATE };
    let enemyState = { ...INITIAL_STATE };
    let deck = initDeck();
    let playerHand = [], enemyHand = [];

    for (let i = 0; i < 6; i++) {
        let p = drawCard(deck); playerHand.push(p.card); deck = p.newDeck;
        let e = drawCard(deck); enemyHand.push(e.card); deck = e.newDeck;
    }

    let isPlayerTurn = true;
    let turnCount = 0;
    let deadHandsCount = 0;

    while (playerState.tower < 50 && playerState.tower > 0 && enemyState.tower < 50 && enemyState.tower > 0) {
        turnCount++;
        if (turnCount > 2000) throw new Error('Game loop infinite');

        let activeState = isPlayerTurn ? playerState : enemyState;
        let activeHand = isPlayerTurn ? playerHand : enemyHand;

        // Resource production
        activeState.bricks += activeState.quarries;
        activeState.gems += activeState.magic;
        activeState.beasts += activeState.dungeon;

        let playAgain = false;
        const playable = activeHand.filter(c => canAfford(c, activeState));
        if (playable.length === 0) deadHandsCount++;

        if (playable.length > 0) {
            const cardToPlay = playable[0];
            if (cardToPlay.color === 'Red') activeState.bricks -= cardToPlay.cost;
            if (cardToPlay.color === 'Blue') activeState.gems -= cardToPlay.cost;
            if (cardToPlay.color === 'Green') activeState.beasts -= cardToPlay.cost;

            const res = applyEffect(cardToPlay, playerState, enemyState, isPlayerTurn);
            playerState = res.newPlayerState;
            enemyState = res.newEnemyState;
            playAgain = res.playAgain;

            activeHand = activeHand.filter(c => c.uid !== cardToPlay.uid);
            const { card: next, newDeck } = drawCard(deck);
            activeHand.push(next); deck = newDeck;
        } else {
            // Discard first card
            const cardToDiscard = activeHand[0];
            activeHand = activeHand.filter(c => c.uid !== cardToDiscard.uid);
            const { card: next, newDeck } = drawCard(deck);
            activeHand.push(next); deck = newDeck;
        }

        if (isPlayerTurn) playerHand = activeHand;
        else enemyHand = activeHand;

        assertValidState(playerState, 'Player');
        assertValidState(enemyState, 'Enemy');

        if (!playAgain) isPlayerTurn = !isPlayerTurn;
    }

    const winner = (playerState.tower >= 50 || enemyState.tower <= 0) ? 'PLAYER' : 'ENEMY';
    return { winner, turnCount, deadHandsCount };
};

const runMany = (count) => {
    let playerWins = 0, enemyWins = 0;
    let totalTurns = 0;
    let minTurns = Infinity, maxTurns = 0;
    let totalDeadHands = 0, gamesWithDeadHands = 0;
    const turnBuckets = { '1-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0, '100+': 0 };

    console.log(`Running ${count} simulated games...`);
    for (let i = 0; i < count; i++) {
        try {
            const res = runSimulation();
            if (res.winner === 'PLAYER') playerWins++;
            else enemyWins++;

            totalTurns += res.turnCount;
            if (res.turnCount < minTurns) minTurns = res.turnCount;
            if (res.turnCount > maxTurns) maxTurns = res.turnCount;

            if (res.turnCount <= 20) turnBuckets['1-20']++;
            else if (res.turnCount <= 40) turnBuckets['21-40']++;
            else if (res.turnCount <= 60) turnBuckets['41-60']++;
            else if (res.turnCount <= 80) turnBuckets['61-80']++;
            else if (res.turnCount <= 100) turnBuckets['81-100']++;
            else turnBuckets['100+']++;

            if (res.deadHandsCount > 0) {
                totalDeadHands += res.deadHandsCount;
                gamesWithDeadHands++;
            }
        } catch (e) {
            console.error(`Crash on simulation ${i + 1}: ${e.message}`);
            process.exit(1);
        }
    }

    const avg = (totalTurns / count).toFixed(1);
    console.log(`\n=== Results (${count} games) ===`);
    console.log(`Player Wins : ${playerWins}  (${(playerWins / count * 100).toFixed(1)}%)`);
    console.log(`Enemy Wins  : ${enemyWins}  (${(enemyWins / count * 100).toFixed(1)}%)`);
    console.log(`\n--- Turn Length ---`);
    console.log(`Average turns per game : ${avg}`);
    console.log(`Shortest game          : ${minTurns} turns`);
    console.log(`Longest game           : ${maxTurns} turns`);
    console.log(`\n--- Turn Distribution ---`);
    for (const [range, cnt] of Object.entries(turnBuckets)) {
        const bar = '█'.repeat(Math.round(cnt / count * 40));
        console.log(`  ${range.padEnd(8)} ${String(cnt).padStart(4)} | ${bar}`);
    }
    console.log(`\n--- Dead Hand Analysis ---`);
    console.log(`Total 'Dead Hand' occurrences : ${totalDeadHands}`);
    console.log(`Games with ≥1 Dead Hand       : ${gamesWithDeadHands} / ${count} (${(gamesWithDeadHands / count * 100).toFixed(2)}%)`);
};

const args = process.argv.slice(2);
const count = parseInt(args[0]) || 1;
runMany(count);
