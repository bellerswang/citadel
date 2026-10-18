import { describe, it, expect } from 'vitest';
import cards from '../src/cards.json';
import cases from './card_cases.json';
import { applyCardEffect } from '../src/engine/engine.js';

const P = { tower: 20, wall: 8, quarries: 3, bricks: 12, magic: 3, gems: 12, dungeon: 3, beasts: 12 };
const E = { tower: 25, wall: 5, quarries: 4, bricks: 15, magic: 2, gems: 15, dungeon: 4, beasts: 15 };
const byId = Object.fromEntries(cards.map(c => [c.id, c]));

describe('per-card effect regression', () => {
    for (const tc of cases) {
        it(`${tc.id} ${tc.name}: ${tc.why}`, () => {
            const res = applyCardEffect(byId[tc.id], { player: { ...P, ...tc.player }, enemy: { ...E, ...tc.enemy } }, 'player');
            expect(res.player).toEqual(tc.expectPlayer);
            expect(res.enemy).toEqual(tc.expectEnemy);
            expect(res.playAgain).toBe(tc.playAgain);
            expect(res.drawDiscard).toBe(tc.drawDiscard);
        });
    }

    it('every card has at least one regression case', () => {
        const covered = new Set(cases.map(c => c.id));
        expect(cards.filter(c => !covered.has(c.id)).map(c => c.id)).toEqual([]);
    });
});
