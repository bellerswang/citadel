// Citadel card effect definitions. Each entry maps a card id to its ops and flags.
export const CARD_EFFECTS = {
    card_001: { ops: [{ op: 'add', target: 'all', stat: 'bricks', value: -8 }] }, // All players lose 8 bricks
    card_002: { ops: [{ op: 'add', target: 'self', stat: 'bricks', value: 2 }, { op: 'add', target: 'self', stat: 'gems', value: 2 }], playAgain: true }, // +2 Bricks. +2 Gems. Play again
    card_003: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 1 }], playAgain: true }, // +1 Wall. Play again
    card_004: { ops: [{ op: 'add', target: 'self', stat: 'quarries', value: 1 }] }, // +1 Quarry
    card_005: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'quarries' }, cmp: '<', right: { who: 'enemy', stat: 'quarries' } }, then: [{ op: 'add', target: 'self', stat: 'quarries', value: 2 }], else: [{ op: 'add', target: 'self', stat: 'quarries', value: 1 }] }] }, // If your quarry is less than the enemy's, +2 Quarry; otherwise +1 Quarry
    card_006: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 4 }, { op: 'add', target: 'self', stat: 'quarries', value: 1 }] }, // +4 Wall. +1 Quarry
    card_007: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 5 }, { op: 'add', target: 'self', stat: 'gems', value: -6 }] }, // +5 Wall. You lose 6 gems
    card_008: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'quarries' }, cmp: '<', right: { who: 'enemy', stat: 'quarries' } }, then: [{ op: 'setTo', target: 'self', stat: 'quarries', from: { who: 'enemy', stat: 'quarries' } }] }] }, // If your quarry is less than the enemy's, your quarry becomes equal to the enemy's
    card_009: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 3 }] }, // +3 Wall
    card_010: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 4 }] }, // +4 Wall
    card_011: { ops: [{ op: 'add', target: 'all', stat: 'quarries', value: 1 }, { op: 'add', target: 'self', stat: 'gems', value: 4 }] }, // +1 to all players' quarries. You gain 4 gems
    card_012: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'wall' }, cmp: '=', right: 0 }, then: [{ op: 'add', target: 'self', stat: 'wall', value: 6 }], else: [{ op: 'add', target: 'self', stat: 'wall', value: 3 }] }] }, // If wall = 0, +6 Wall; otherwise +3 Wall
    card_013: { ops: [{ op: 'wallDamage', target: 'all', value: 5 }], playAgain: true }, // All walls take 5 damage. Play again
    card_014: { ops: [{ op: 'add', target: 'self', stat: 'magic', value: 1 }], playAgain: true }, // +1 Magic. Play again
    card_015: { ops: [{ op: 'add', target: 'all', stat: 'quarries', value: -1 }] }, // -1 to all players' quarries
    card_016: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 6 }] }, // +6 Wall
    card_017: { ops: [{ op: 'add', target: 'enemy', stat: 'quarries', value: -1 }] }, // -1 enemy Quarry
    card_018: { ops: [{ op: 'add', target: 'self', stat: 'quarries', value: 2 }] }, // +2 Quarry
    card_019: { ops: [{ op: 'add', target: 'self', stat: 'quarries', value: -1 }, { op: 'add', target: 'self', stat: 'wall', value: 10 }, { op: 'add', target: 'self', stat: 'gems', value: 5 }] }, // -1 Quarry. +10 Wall. You gain 5 gems
    card_020: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 8 }] }, // +8 Wall
    card_021: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 5 }, { op: 'add', target: 'self', stat: 'dungeon', value: 1 }] }, // +5 Wall. +1 Dungeon
    card_022: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 7 }, { op: 'add', target: 'self', stat: 'gems', value: 7 }] }, // +7 Wall. Gain 7 gems
    card_023: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 6 }, { op: 'add', target: 'self', stat: 'tower', value: 3 }] }, // +6 Wall. +3 Tower
    card_024: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 12 }] }, // +12 Wall
    card_025: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 8 }, { op: 'add', target: 'self', stat: 'tower', value: 5 }] }, // +8 Wall. +5 Tower
    card_026: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 15 }] }, // +15 Wall
    card_027: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 6 }, { op: 'damage', target: 'enemy', value: 10 }] }, // +6 Wall. 10 damage to enemy
    card_028: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 20 }, { op: 'add', target: 'self', stat: 'tower', value: 8 }] }, // +20 Wall. +8 Tower
    card_029: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 9 }, { op: 'add', target: 'self', stat: 'beasts', value: -5 }] }, // +9 Wall. Lose 5 recruits
    card_030: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 1 }, { op: 'add', target: 'self', stat: 'tower', value: 1 }, { op: 'add', target: 'self', stat: 'beasts', value: 2 }] }, // +1 Wall. +1 Tower. +2 recruits
    card_031: { ops: [{ op: 'add', target: 'lowestWall', stat: 'dungeon', value: -1 }, { op: 'towerDamage', target: 'lowestWall', value: 2 }] }, // Player(s) with lowest wall lose 1 Dungeon and take 2 tower damage
    card_032: { ops: [{ op: 'add', target: 'self', stat: 'beasts', value: 6 }, { op: 'add', target: 'self', stat: 'wall', value: 6 }, { op: 'if', cond: { left: { who: 'self', stat: 'dungeon' }, cmp: '<', right: { who: 'enemy', stat: 'dungeon' } }, then: [{ op: 'add', target: 'self', stat: 'dungeon', value: 1 }] }] }, // +6 recruits. +6 Wall. If dungeon < enemy dungeon, +1 Dungeon
    card_033: { ops: [{ op: 'add', target: 'self', stat: 'wall', value: 7 }, { op: 'damage', target: 'enemy', value: 6 }] }, // +7 Wall. 6 damage to enemy
    card_034: { ops: [{ op: 'swap', stat: 'wall' }] }, // Switch your wall with enemy wall
    card_035: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 1 }], playAgain: true }, // +1 Tower. Play again
    card_036: { ops: [{ op: 'towerDamage', target: 'enemy', value: 1 }], playAgain: true }, // 1 damage to enemy tower. Play again
    card_037: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 3 }] }, // +3 Tower
    card_038: { ops: [{ op: 'add', target: 'self', stat: 'magic', value: 1 }] }, // +1 Magic
    card_039: { ops: [], drawDiscard: 1, playAgain: true }, // Draw 1 card, discard 1 card, play again
    card_040: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 3 }], undiscardable: true }, // +3 Tower. This card cannot be discarded without playing it
    card_041: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 2 }, { op: 'towerDamage', target: 'enemy', value: 2 }] }, // +2 Tower. 2 damage to enemy tower
    card_042: { ops: [{ op: 'add', target: 'self', stat: 'magic', value: 1 }, { op: 'add', target: 'self', stat: 'tower', value: 3 }, { op: 'add', target: 'enemy', stat: 'tower', value: 1 }] }, // +1 Magic. +3 Tower. +1 enemy Tower
    card_043: { ops: [{ op: 'towerDamage', target: 'enemy', value: 3 }] }, // 3 damage to enemy tower
    card_044: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 5 }] }, // +5 Tower
    card_045: { ops: [{ op: 'towerDamage', target: 'enemy', value: 5 }] }, // 5 damage to enemy tower
    card_046: { ops: [{ op: 'towerDamage', target: 'self', value: 5 }, { op: 'add', target: 'self', stat: 'magic', value: 2 }] }, // 5 damage to your tower. +2 Magic
    card_047: { ops: [{ op: 'add', target: 'self', stat: 'magic', value: 1 }, { op: 'add', target: 'self', stat: 'tower', value: 3 }, { op: 'add', target: 'self', stat: 'wall', value: 3 }] }, // +1 Magic. +3 Tower. +3 Wall
    card_048: { ops: [{ op: 'equalizeMax', stat: 'magic' }] }, // All players' magic equals the highest player's magic
    card_049: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 8 }] }, // +8 Tower
    card_050: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 5 }, { op: 'add', target: 'self', stat: 'magic', value: 1 }] }, // +5 Tower. +1 Magic
    card_051: { ops: [{ op: 'add', target: 'self', stat: 'magic', value: -1 }, { op: 'towerDamage', target: 'enemy', value: 9 }] }, // -1 Magic. 9 damage to enemy tower
    card_052: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 5 }, { op: 'add', target: 'enemy', stat: 'bricks', value: -6 }] }, // +5 Tower. Enemy loses 6 bricks
    card_053: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 11 }] }, // +11 Tower
    card_054: { ops: [{ op: 'towerDamage', target: 'all', value: 7 }, { op: 'add', target: 'all', stat: 'magic', value: -1 }] }, // 7 damage to all towers. All players' magic -1
    card_055: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 6 }, { op: 'towerDamage', target: 'enemy', value: 4 }] }, // +6 Tower. 4 damage to all enemy towers
    card_056: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 7 }, { op: 'add', target: 'self', stat: 'bricks', value: -10 }] }, // +7 Tower. Lose 10 bricks
    card_057: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 8 }, { op: 'add', target: 'self', stat: 'wall', value: 3 }] }, // +8 Tower. +3 Wall
    card_058: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 8 }, { op: 'add', target: 'self', stat: 'dungeon', value: 1 }] }, // +8 Tower. +1 Dungeon
    card_059: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 15 }] }, // +15 Tower
    card_060: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 10 }, { op: 'add', target: 'self', stat: 'wall', value: 5 }, { op: 'add', target: 'self', stat: 'beasts', value: 5 }] }, // +10 Tower. +5 Wall. Gain 5 recruits
    card_061: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 12 }, { op: 'damage', target: 'enemy', value: 6 }] }, // +12 Tower. 6 damage to all enemies
    card_062: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 20 }] }, // +20 Tower
    card_063: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 11 }, { op: 'add', target: 'self', stat: 'wall', value: -6 }] }, // +11 Tower. -6 Wall
    card_064: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'tower' }, cmp: '<', right: { who: 'enemy', stat: 'tower' } }, then: [{ op: 'add', target: 'self', stat: 'tower', value: 2 }], else: [{ op: 'add', target: 'self', stat: 'tower', value: 1 }] }] }, // If tower < enemy tower, +2 Tower; otherwise +1 Tower
    card_065: { ops: [{ op: 'add', target: 'all', stat: 'tower', value: 1 }, { op: 'add', target: 'self', stat: 'gems', value: 3 }] }, // +1 Tower to all players. You gain 3 gems
    card_066: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 4 }, { op: 'add', target: 'self', stat: 'beasts', value: -3 }, { op: 'towerDamage', target: 'enemy', value: 2 }] }, // +4 Tower. You lose 3 recruits. 2 damage to enemy tower
    card_067: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'tower' }, cmp: '>', right: { who: 'enemy', stat: 'wall' } }, then: [{ op: 'towerDamage', target: 'enemy', value: 8 }], else: [{ op: 'damage', target: 'enemy', value: 8 }] }] }, // If tower > enemy wall, 8 damage to enemy tower; otherwise 8 damage
    card_068: { ops: [{ op: 'add', target: 'self', stat: 'tower', value: 13 }, { op: 'add', target: 'self', stat: 'beasts', value: 6 }, { op: 'add', target: 'self', stat: 'bricks', value: 6 }] }, // +13 Tower. +6 recruits. +6 Bricks
    card_069: { ops: [{ op: 'add', target: 'all', stat: 'beasts', value: -6 }] }, // All players lose 6 recruits
    card_070: { ops: [{ op: 'damage', target: 'enemy', value: 2 }], playAgain: true }, // 2 damage. Play again
    card_071: { ops: [{ op: 'damage', target: 'enemy', value: 4 }, { op: 'add', target: 'self', stat: 'gems', value: -3 }] }, // 4 damage. You lose 3 gems
    card_072: { ops: [{ op: 'add', target: 'self', stat: 'dungeon', value: 1 }] }, // +1 Dungeon
    card_073: { ops: [], drawDiscard: 1, playAgain: true }, // Draw 1 card, discard 1 card, play again
    card_074: { ops: [{ op: 'damage', target: 'enemy', value: 6 }, { op: 'damage', target: 'self', value: 3 }] }, // 6 damage. You take 3 damage
    card_075: { ops: [{ op: 'towerDamage', target: 'enemy', value: 3 }, { op: 'damage', target: 'self', value: 1 }] }, // 3 damage to enemy tower. You take 1 damage
    card_076: { ops: [{ op: 'towerDamage', target: 'enemy', value: 2 }], playAgain: true }, // 2 damage to enemy tower. Play again
    card_077: { ops: [{ op: 'damage', target: 'enemy', value: 5 }] }, // 5 damage
    card_078: { ops: [{ op: 'damage', target: 'enemy', value: 4 }, { op: 'add', target: 'self', stat: 'wall', value: 3 }] }, // 4 damage. +3 Wall
    card_079: { ops: [{ op: 'towerDamage', target: 'enemy', value: 4 }] }, // 4 damage to enemy tower
    card_080: { ops: [{ op: 'add', target: 'self', stat: 'dungeon', value: 2 }] }, // +2 Dungeon
    card_081: { ops: [{ op: 'damage', target: 'enemy', value: 2 }, { op: 'add', target: 'self', stat: 'wall', value: 4 }, { op: 'add', target: 'self', stat: 'tower', value: 2 }] }, // 2 damage. +4 Wall. +2 Tower
    card_082: { ops: [{ op: 'add', target: 'all', stat: 'dungeon', value: 1 }, { op: 'add', target: 'self', stat: 'beasts', value: 3 }] }, // +1 to all players' dungeon. You gain 3 recruits
    card_083: { ops: [{ op: 'damage', target: 'enemy', value: 6 }] }, // 6 damage
    card_084: { ops: [{ op: 'damage', target: 'enemy', value: 7 }] }, // 7 damage
    card_085: { ops: [{ op: 'damage', target: 'enemy', value: 6 }, { op: 'add', target: 'enemy', stat: 'beasts', value: -3 }] }, // 6 damage. Enemy loses 3 recruits
    card_086: { ops: [{ op: 'damage', target: 'enemy', value: 6 }, { op: 'add', target: 'all', stat: 'bricks', value: -5 }, { op: 'add', target: 'all', stat: 'gems', value: -5 }, { op: 'add', target: 'all', stat: 'beasts', value: -5 }] }, // 6 damage. All players lose 5 bricks, gems, and recruits
    card_087: { ops: [{ op: 'if', cond: { left: { who: 'enemy', stat: 'wall' }, cmp: '=', right: 0 }, then: [{ op: 'damage', target: 'enemy', value: 10 }], else: [{ op: 'damage', target: 'enemy', value: 6 }] }] }, // If enemy wall = 0, 10 damage; otherwise 6 damage
    card_088: { ops: [{ op: 'damage', target: 'enemy', value: 9 }] }, // 9 damage
    card_089: { ops: [{ op: 'if', cond: { left: { who: 'enemy', stat: 'wall' }, cmp: '>', right: 0 }, then: [{ op: 'damage', target: 'enemy', value: 10 }], else: [{ op: 'damage', target: 'enemy', value: 7 }] }] }, // If enemy wall > 0, 10 damage; otherwise 7 damage
    card_090: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'magic' }, cmp: '>', right: { who: 'enemy', stat: 'magic' } }, then: [{ op: 'damage', target: 'enemy', value: 12 }], else: [{ op: 'damage', target: 'enemy', value: 8 }] }] }, // If magic > enemy magic, 12 damage; otherwise 8 damage
    card_091: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'wall' }, cmp: '>', right: { who: 'enemy', stat: 'wall' } }, then: [{ op: 'towerDamage', target: 'enemy', value: 6 }], else: [{ op: 'damage', target: 'enemy', value: 6 }] }] }, // If wall > enemy wall, 6 damage to enemy tower; otherwise 6 damage
    card_092: { ops: [{ op: 'towerDamage', target: 'enemy', value: 5 }, { op: 'add', target: 'enemy', stat: 'beasts', value: -8 }] }, // 5 damage to enemy tower. Enemy loses 8 recruits
    card_093: { ops: [{ op: 'damage', target: 'enemy', value: 8 }, { op: 'add', target: 'enemy', stat: 'quarries', value: -1 }] }, // 8 damage. -1 enemy Quarry
    card_094: { ops: [{ op: 'steal', items: [{ stat: 'gems', value: 10 }, { stat: 'bricks', value: 5 }] }] }, // Enemy loses 10 gems and 5 bricks; you gain half of the amount lost, rounded up
    card_095: { ops: [{ op: 'damage', target: 'enemy', value: 10 }, { op: 'add', target: 'self', stat: 'wall', value: 4 }] }, // 10 damage. +4 Wall
    card_096: { ops: [{ op: 'damage', target: 'enemy', value: 10 }, { op: 'add', target: 'enemy', stat: 'beasts', value: -5 }, { op: 'add', target: 'enemy', stat: 'dungeon', value: -1 }] }, // 10 damage. Enemy loses 5 recruits. -1 enemy Dungeon
    card_097: { ops: [{ op: 'damage', target: 'enemy', value: 20 }, { op: 'add', target: 'enemy', stat: 'gems', value: -10 }, { op: 'add', target: 'enemy', stat: 'dungeon', value: -1 }] }, // 20 damage. Enemy loses 10 gems. -1 enemy Dungeon
    card_098: { ops: [{ op: 'if', cond: { left: { who: 'self', stat: 'wall' }, cmp: '>', right: { who: 'enemy', stat: 'wall' } }, then: [{ op: 'damage', target: 'enemy', value: 3 }], else: [{ op: 'damage', target: 'enemy', value: 2 }] }] }, // If wall > enemy wall, 3 damage; otherwise 2 damage
    card_099: { ops: [{ op: 'damage', target: 'enemy', value: 3 }, { op: 'add', target: 'self', stat: 'gems', value: 1 }] }, // 3 damage. +1 Gem
    card_100: { ops: [{ op: 'damage', target: 'enemy', value: 8 }, { op: 'towerDamage', target: 'self', value: 3 }] }, // 8 damage. Your tower takes 3 damage
    card_101: { ops: [{ op: 'damage', target: 'enemy', value: 13 }, { op: 'add', target: 'self', stat: 'gems', value: -3 }] }, // 13 damage. Lose 3 gems
    card_102: { ops: [{ op: 'towerDamage', target: 'enemy', value: 12 }] }, // 12 damage to enemy tower
};
