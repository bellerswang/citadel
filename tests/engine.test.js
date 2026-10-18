import { describe, it, expect } from 'vitest';
import cards from '../src/cards.json';
import { INITIAL_STATE, canAfford, payCost, produce, playCardOnState, checkWinner, applyCardEffect } from '../src/engine/engine.js';
import { simulateGame, simulateMany, mulberry32, createDeck, discardRandomForEffect, chooseActionFirst, chooseActionGreedy } from '../src/engine/game.js';

const byId = Object.fromEntries(cards.map(c => [c.id, c]));

describe('engine core rules', () => {
    it('production adds quarries/magic/dungeon to bricks/gems/beasts', () => {
        expect(produce(INITIAL_STATE)).toEqual({ ...INITIAL_STATE, bricks: 7, gems: 7, beasts: 7 });
    });
    it('cost is paid from the colour resource', () => {
        expect(canAfford(byId.card_024, { ...INITIAL_STATE, bricks: 12 })).toBe(false); // MondoWall costs 13
        expect(payCost(byId.card_024, { ...INITIAL_STATE, bricks: 13 }).bricks).toBe(0);
        expect(payCost(byId.card_053, INITIAL_STATE).gems).toBe(0);
        expect(payCost(byId.card_077, INITIAL_STATE).beasts).toBe(2);
    });
    it('playCardOnState pays then applies, and works for the enemy actor', () => {
        const s = { player: { ...INITIAL_STATE }, enemy: { ...INITIAL_STATE, beasts: 10 } };
        const r = playCardOnState(byId.card_083, s, 'enemy'); // Slasher: 6 damage
        expect(r.enemy.beasts).toBe(5);
        expect(r.player.wall).toBe(4);
        expect(r.player.tower).toBe(30);
    });
    it('effects never mutate their input', () => {
        const s = { player: { ...INITIAL_STATE }, enemy: { ...INITIAL_STATE } };
        const frozen = JSON.stringify(s);
        for (const c of cards) applyCardEffect(c, s, 'player');
        expect(JSON.stringify(s)).toBe(frozen);
    });
    it('no card produces negative / NaN stats or production below 1 from a starved state', () => {
        const starved = { tower: 1, wall: 0, quarries: 1, bricks: 0, magic: 1, gems: 0, dungeon: 1, beasts: 0 };
        for (const c of cards) for (const actor of ['player', 'enemy']) {
            const r = applyCardEffect(c, { player: starved, enemy: starved }, actor);
            for (const side of [r.player, r.enemy]) for (const [k, v] of Object.entries(side)) {
                expect(Number.isFinite(v), `${c.id} ${k}`).toBe(true);
                expect(v, `${c.id} ${k}`).toBeGreaterThanOrEqual(['quarries', 'magic', 'dungeon'].includes(k) ? 1 : 0);
            }
        }
    });
    it('checkWinner', () => {
        expect(checkWinner({ ...INITIAL_STATE, tower: 50 }, INITIAL_STATE)).toEqual({ winner: 'PLAYER', reason: 'tower' });
        expect(checkWinner(INITIAL_STATE, { ...INITIAL_STATE, tower: 0 })).toEqual({ winner: 'PLAYER', reason: 'destruction' });
        expect(checkWinner({ ...INITIAL_STATE, tower: 0 }, INITIAL_STATE)).toEqual({ winner: 'ENEMY', reason: 'destruction' });
        expect(checkWinner(INITIAL_STATE, INITIAL_STATE)).toBeNull();
    });
});

describe('game loop', () => {
    it('deck has 2 copies of each card with unique uids', () => {
        const d = createDeck(cards, mulberry32(1));
        expect(d).toHaveLength(204);
        expect(new Set(d.map(c => c.uid)).size).toBe(204);
    });
    it('effect discard never removes Lodestone', () => {
        const hand = [byId.card_040, byId.card_040];
        expect(discardRandomForEffect(hand, () => 0.5).discarded).toBeNull();
        expect(discardRandomForEffect([byId.card_040, byId.card_001], () => 0).discarded.id).toBe('card_001');
    });
    it('first-card AI never discards Lodestone when it has another option', () => {
        const poor = { ...INITIAL_STATE, gems: 0, bricks: 0, beasts: 0 };
        expect(chooseActionFirst([byId.card_040, byId.card_024], poor, poor)).toEqual({ type: 'discard', card: byId.card_024 });
    });
    it('greedy AI takes a winning play', () => {
        const me = { ...INITIAL_STATE, tower: 45, gems: 30 };
        const a = chooseActionGreedy([byId.card_037, byId.card_044], me, INITIAL_STATE);
        expect(a.card.id).toBe('card_044'); // Ruby +5 → 50 wins
    });
    it('simulated games are deterministic per seed and always finish', () => {
        const a = simulateGame({ cards, rng: mulberry32(42) });
        const b = simulateGame({ cards, rng: mulberry32(42) });
        expect(a.winner).toBe(b.winner);
        expect(a.turns).toBe(b.turns);
        const agg = simulateMany({ cards, games: 200, seed: 7 });
        expect(agg.timeouts).toBe(0);
        expect(agg.wins.player + agg.wins.enemy).toBe(200);
    });
});
