# 数值模拟报告（共享引擎，2026-10-18）

运行命令：`npm run simulate -- 10000 --policy=<first|greedy|mixed> --seed=1`。每组 10,000 局，先后手交替。
"回合" = 单方的一个行动回合（"再来一回合"不计为新回合）。

| AI 策略 | 玩家胜 / 敌人胜 | 先手胜率 | 平均回合 | 最短 / 最长 | 胜利方式：塔建到 50 / 摧毁敌塔 | 出现过死手的对局 |
|---|---|---|---|---|---|---|
| first（游戏内 AI：打第一张能打的牌） | 50.9% / 49.1% | 54.4% | 46.0 | 5 / 202 | 81% / 19% | 78.9% |
| greedy（单步贪心估值） | 49.8% / 50.2% | 55.9% | 39.1 | 6 / 162 | 87% / 13% | 67.3% |
| mixed（玩家 greedy vs 敌人 first） | **66.5%** / 33.5% | 54.6% | 41.5 | 7 / 181 | 84% / 16% | 73.1% |

对照：旧 `simulate.js`（带 bug 的效果、玩家永远先手）：玩家 54.8%，平均 43.3 回合。

## 结论
- **先手优势约 55%**（两种对称 AI 下都稳定），属于偏高但可接受；如需平衡，可以让后手开局多 1 点资源或多 1 张牌。
- **建塔获胜占绝对多数（81–87%）**，打塔获胜只占 13–19%。蓝色（宝石/建塔）卡的出牌胜率最高（≈53.5%，红 ≈49.7%，绿 ≈50.7%）。攻击线偏弱。
- 稍微聪明一点的 AI 就能以 66.5% 胜率赢过现在游戏里的 AI，**游戏内 AI 可以考虑升级**（`chooseActionGreedy` 已经写好了）。
- 死手（手里没有能打的牌）很常见：67–79% 的对局至少出现过一次。

## 单卡（greedy vs greedy，出牌胜率 = 出这张牌的一方最终获胜的比例）
- 最强：Dragon's Eye 83.9%，Phase Jewel 73.0%，Diamond 72.7%，Dragon 72.1%，Dragon's Heart 70.6%，Lava Jewel 69.0%，Pegasus Lancer 67.0%。高费牌的出牌胜率天然偏高（领先方才攒得起资源），这个指标只能参考。
- 最弱：Parity 38.1%，Discord 39.9%，Brick Shortage 41.6%，Earthquake 42.0%，Work Overtime 42.1%，MadCowDisease 42.2%，Tremors 43.0%，Shatterer 43.3%，CoppingtheTech 43.5%。对双方都生效的牌和自损牌偏弱，但贪心 AI 不懂在什么时机打它们，结果偏悲观。
- 最常打出：Spell Weavers、Emerald、Ruby、Minotaur、Harmonic Vibe（便宜的产能牌和建塔牌）。
- 打出最少：Dragon's Heart、Dragon、Shift、Rock Launcher、Dragon's Eye（费用 17–25，很难攒够）。**没有从未被打出的牌，也没有卡死或报错的牌**：每局都正常结束，没有超时，也没有出现负数或 NaN。

## Python 强度工具（tools/card_power_analyzer.py）
- 直接运行会报错：文件里有非法 UTF-8 字节（`SyntaxError: Non-UTF-8 code`）。按"容错解码"方式运行可以出结果。
- 它用自己的一套正则解析效果文本，得出的排名明显不可靠，例如：Strip Mine 净值 +18 排第一；Brick Shortage / MadCowDisease 这种双方都掉资源的牌被算成正值；Berserker、Goblin Mob 被算成最差。建议以后改成直接读 `src/engine/cardEffects.js` 的结构化数据。本 PR 没有改它。
