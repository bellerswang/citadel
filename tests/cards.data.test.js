import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import cards from '../src/cards.json';
import { CARD_EFFECTS } from '../src/engine/cardEffects.js';
import { STATS } from '../src/engine/engine.js';

const ROOT = path.resolve(__dirname, '..');
const COLORS = ['Red', 'Blue', 'Green'];
const KNOWN_OPS = ['add', 'damage', 'towerDamage', 'wallDamage', 'if', 'setTo', 'swap', 'equalizeMax', 'steal'];
const TARGETS = ['self', 'enemy', 'all', 'lowestWall'];

describe('cards.json data integrity', () => {
    it('has 102 cards', () => expect(cards).toHaveLength(102));

    it('ids are unique and sequential card_001..card_102', () => {
        const ids = cards.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id, i) => expect(id).toBe(`card_${String(i + 1).padStart(3, '0')}`));
    });

    it.each(cards.map(c => [c.id, c]))('%s has a valid schema', (_id, c) => {
        for (const key of ['id', 'name', 'name_zh', 'effect', 'effect_zh', 'color', 'cost']) expect(c).toHaveProperty(key);
        expect(COLORS).toContain(c.color);
        expect(Number.isInteger(c.cost)).toBe(true);
        expect(c.cost).toBeGreaterThanOrEqual(0);
        expect(c.cost).toBeLessThanOrEqual(30);
        for (const key of ['name', 'name_zh', 'effect', 'effect_zh']) expect(c[key].trim().length).toBeGreaterThan(0);
    });

    it('every card has an illustration file', () => {
        const missing = cards.filter(c => !fs.existsSync(path.join(ROOT, 'src/assets/cards', `${c.id}.png`))).map(c => c.id);
        expect(missing).toEqual([]);
    });

    it('names are unique (en and zh)', () => {
        expect(new Set(cards.map(c => c.name)).size).toBe(cards.length);
        expect(new Set(cards.map(c => c.name_zh)).size).toBe(cards.length);
    });
});

describe('cardEffects.js structure', () => {
    it('defines exactly one effect per card', () => {
        expect(Object.keys(CARD_EFFECTS).sort()).toEqual(cards.map(c => c.id).sort());
    });

    const checkOp = (op) => {
        expect(KNOWN_OPS).toContain(op.op);
        if ('target' in op) expect(TARGETS).toContain(op.target);
        if ('stat' in op) expect(STATS).toContain(op.stat);
        if ('value' in op) expect(Number.isInteger(op.value)).toBe(true);
        if (op.op === 'if') { op.then.forEach(checkOp); (op.else || []).forEach(checkOp); }
        if (op.op === 'steal') op.items.forEach(i => expect(STATS).toContain(i.stat));
    };
    it.each(Object.entries(CARD_EFFECTS))('%s uses only known ops/targets/stats', (_id, def) => {
        def.ops.forEach(checkOp);
    });

    it('play-again flag matches card text', () => {
        for (const c of cards) expect([c.id, Boolean(CARD_EFFECTS[c.id].playAgain)]).toEqual([c.id, /play again/i.test(c.effect)]);
    });

    it('only Lodestone is undiscardable', () => {
        expect(Object.entries(CARD_EFFECTS).filter(([, d]) => d.undiscardable).map(([id]) => id)).toEqual(['card_040']);
    });
});
