// Citadel effects engine: pure, data-driven, shared by the React hook, the
// in-app autoplay and the Node simulator. No React, no DOM.
import { CARD_EFFECTS } from './cardEffects.js';

export const INITIAL_STATE = Object.freeze({ tower: 30, wall: 10, quarries: 2, bricks: 5, magic: 2, gems: 5, dungeon: 2, beasts: 5 });
export const WIN_TOWER = 50;
export const HAND_SIZE = 6;

export const STATS = ['tower', 'wall', 'quarries', 'bricks', 'magic', 'gems', 'dungeon', 'beasts'];
export const PRODUCTION_STATS = ['quarries', 'magic', 'dungeon'];
// Production buildings never drop below 1 (Arcomage rule); everything else floors at 0.
export const minFor = (stat) => (PRODUCTION_STATS.includes(stat) ? 1 : 0);

const RESOURCE_BY_COLOR = { Red: 'bricks', Blue: 'gems', Green: 'beasts' };
export const resourceFieldForCard = (card) => RESOURCE_BY_COLOR[card?.color] || null;

export const canAfford = (card, state) => {
    const field = resourceFieldForCard(card);
    return field ? state[field] >= card.cost : false;
};

export const getCardEffect = (card) => {
    const def = CARD_EFFECTS[card.id];
    if (!def) throw new Error(`No effect definition for ${card.id}`);
    return def;
};

export const isUndiscardable = (card) => Boolean(CARD_EFFECTS[card.id]?.undiscardable);

export const produce = (state) => ({
    ...state,
    bricks: state.bricks + state.quarries,
    gems: state.gems + state.magic,
    beasts: state.beasts + state.dungeon,
});

export const payCost = (card, state) => {
    const field = resourceFieldForCard(card);
    if (!field) return state;
    return { ...state, [field]: Math.max(0, state[field] - card.cost) };
};

// ─── primitive operations on a single side ────────────────────────────────
const add = (s, stat, value) => ({ ...s, [stat]: Math.max(minFor(stat), s[stat] + value) });
const wallFirstDamage = (s, dmg) => {
    if (dmg <= s.wall) return { ...s, wall: s.wall - dmg };
    return { ...s, wall: 0, tower: Math.max(0, s.tower - (dmg - s.wall)) };
};
const towerDamage = (s, dmg) => ({ ...s, tower: Math.max(0, s.tower - dmg) });

const sidesFor = (target, ctx) => {
    if (target === 'self') return ['self'];
    if (target === 'enemy') return ['enemy'];
    if (target === 'all') return ['self', 'enemy'];
    if (target === 'lowestWall') {
        const min = Math.min(ctx.self.wall, ctx.enemy.wall);
        return ['self', 'enemy'].filter(k => ctx[k].wall === min);
    }
    throw new Error(`Unknown target ${target}`);
};

const valueOf = (ref, ctx) => (typeof ref === 'number' ? ref : ctx[ref.who][ref.stat]);
const CMP = { '<': (a, b) => a < b, '>': (a, b) => a > b, '=': (a, b) => a === b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b };
const testCond = (cond, ctx) => CMP[cond.cmp](valueOf(cond.left, ctx), valueOf(cond.right, ctx));

const runOp = (op, ctx) => {
    switch (op.op) {
        case 'add':
            for (const k of sidesFor(op.target, ctx)) ctx[k] = add(ctx[k], op.stat, op.value);
            return;
        case 'damage':
            for (const k of sidesFor(op.target, ctx)) ctx[k] = wallFirstDamage(ctx[k], op.value);
            return;
        case 'towerDamage':
            for (const k of sidesFor(op.target, ctx)) ctx[k] = towerDamage(ctx[k], op.value);
            return;
        case 'wallDamage':
            for (const k of sidesFor(op.target, ctx)) ctx[k] = add(ctx[k], 'wall', -op.value);
            return;
        case 'if':
            for (const sub of (testCond(op.cond, ctx) ? op.then : op.else || [])) runOp(sub, ctx);
            return;
        case 'setTo': { // target.stat = value(ref)
            const v = valueOf(op.from, ctx);
            for (const k of sidesFor(op.target, ctx)) ctx[k] = { ...ctx[k], [op.stat]: Math.max(minFor(op.stat), v) };
            return;
        }
        case 'swap': {
            const a = ctx.self[op.stat], b = ctx.enemy[op.stat];
            ctx.self = { ...ctx.self, [op.stat]: b };
            ctx.enemy = { ...ctx.enemy, [op.stat]: a };
            return;
        }
        case 'equalizeMax': {
            const m = Math.max(ctx.self[op.stat], ctx.enemy[op.stat]);
            ctx.self = { ...ctx.self, [op.stat]: m };
            ctx.enemy = { ...ctx.enemy, [op.stat]: m };
            return;
        }
        case 'steal': { // enemy loses up to `value` of stat; self gains ceil(actualLost / 2)
            for (const { stat, value } of op.items) {
                const lost = Math.min(value, ctx.enemy[stat]);
                ctx.enemy = { ...ctx.enemy, [stat]: ctx.enemy[stat] - lost };
                ctx.self = { ...ctx.self, [stat]: ctx.self[stat] + Math.ceil(lost / 2) };
            }
            return;
        }
        default:
            throw new Error(`Unknown op ${op.op}`);
    }
};

/**
 * Apply a card's effect (cost NOT included) for `actor` ('player' | 'enemy').
 * Returns { player, enemy, playAgain, drawDiscard }.
 */
export const applyCardEffect = (card, { player, enemy }, actor = 'player') => {
    const def = getCardEffect(card);
    const isPlayer = actor === 'player';
    const ctx = { self: { ...(isPlayer ? player : enemy) }, enemy: { ...(isPlayer ? enemy : player) } };
    for (const op of def.ops) runOp(op, ctx);
    return {
        player: isPlayer ? ctx.self : ctx.enemy,
        enemy: isPlayer ? ctx.enemy : ctx.self,
        playAgain: Boolean(def.playAgain),
        drawDiscard: def.drawDiscard || 0,
    };
};

/** Pay the cost then apply the effect. */
export const playCardOnState = (card, states, actor = 'player') => {
    const key = actor === 'player' ? 'player' : 'enemy';
    const paid = { ...states, [key]: payCost(card, states[key]) };
    return applyCardEffect(card, paid, actor);
};

// Mirrors the original hook's precedence: an enemy condition is evaluated last and wins ties.
export const checkWinner = (player, enemy) => {
    let winner = null, reason = null;
    if (player.tower >= WIN_TOWER) { winner = 'PLAYER'; reason = 'tower'; }
    else if (enemy.tower <= 0) { winner = 'PLAYER'; reason = 'destruction'; }
    if (enemy.tower >= WIN_TOWER) { winner = 'ENEMY'; reason = 'tower'; }
    else if (player.tower <= 0) { winner = 'ENEMY'; reason = 'destruction'; }
    return winner ? { winner, reason } : null;
};
