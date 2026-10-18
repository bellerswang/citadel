# 卡牌效果审计报告（refactor/effects-engine）

对比对象：每张卡的文字描述（期望，已由新引擎 `src/engine/cardEffects.js` + 141 个回归用例固化） vs `main` 分支上三份旧实现的实际结果：
- **游戏**：`useGameState.js` 里的 `applyEffect`（玩家实际体验到的效果）
- **simulate.js**：旧 Node 模拟器里的副本
- **autoplay**：`runAutoplay` 里的简化副本

测试状态：P = 塔20/墙8/采石场3/砖12/魔法3/宝石12/地下城3/新兵12；E = 塔25/墙5/采石场4/砖15/魔法2/宝石15/地下城4/新兵15（用例各自可覆盖）。结果由脚本从 main 分支抽取三份旧代码、逐卡逐用例对比自动生成。

统计：游戏实际效果有误 **22** 张；simulate.js 有误 **25** 张；autoplay 有误 **58** 张（autoplay 只处理伤害和 +N，基本不可用）。

## 游戏中实际出错的卡（已全部修复）

| 卡 | 描述 | 游戏实际结果（期望→实际） | simulate.js 是否同样出错 |
|---|---|---|---|
| card_001 Brick Shortage（砖块短缺） | All players lose 8 bricks | （base: both players lose 8 bricks）player.bricks 期望4 实际0 | 同样出错 |
| card_005 Mother Lode（主矿脉） | if quarry < enemy quarry, +2 quarry. else, +1 quarry | （base: quarry 3 < enemy quarry 4, so +2 quarry）player.quarries 期望5 实际7<br>（else branch: quarry not less than enemy quarry, so +1 quarry）player.quarries 期望5 实际8 | 同样出错 |
| card_012 Foundations（地基） | if wall = 0, +6 wall, else +3 wall | （base: wall is not 0, so +3 wall）player.wall 期望11 实际20<br>（other branch: wall is 0, so +6 wall）player.wall 期望6 实际12 | 同样出错 |
| card_013 Tremors（震荡） | all walls take 5 damage. play again | （floor: walls cannot go below 0）enemy.tower 期望25 实际22 | 同样出错 |
| card_019 Strip Mine（露天开采） | -1 Quarry. +10 Wall. You gain 5 gems | （base: -1 quarry, +10 wall, gain 5 gems）player.quarries 期望2 实际3 | 同样出错 |
| card_031 Flood Water（洪水） | player(s) w/lowest wall are -1 dungeon and 2 damage to tower | （base: enemy has lowest wall, so enemy loses 1 dungeon and 2 tower）player.tower 期望20 实际18；enemy.dungeon 期望3 实际4<br>（other branch: self has lowest wall, so self loses 1 dungeon and 2 tower）player.dungeon 期望2 实际3；enemy.tower 期望25 实际23<br>（floor: dungeon cannot go below 1, tower cannot go below 0）player.tower 期望20 实际18 | 同样出错 |
| card_032 Barracks（兵营） | +6 recruits, +6 wall if dungeon < enemy dungeon, +1 dungeon | （else branch: dungeon not less than enemy dungeon, so no +1 dungeon）player.dungeon 期望5 实际6 | 同样出错 |
| card_054 Discord（不和） | 7 damage to all towers, all player's magic -1 | （both towers take 7 direct damage and both players' magic -1）player.magic 期望2 实际1；enemy.tower 期望18 实际16；enemy.wall 期望5 实际0<br>（towers cannot go below 0 and magic cannot go below 1）enemy.wall 期望5 实际0 | 出错情况不同：（both towers take 7 direct damage and both players' magic -1）enemy.tower 期望18 实际16；enemy.wall 期望5 实际0 / （towers cannot go below 0 and magic cannot go below 1）enemy.wall 期望5 实际0 |
| card_055 Fire Ruby（火红宝石） | +6 tower 4 damage to all enemy towers | （+6 tower and 4 direct damage to enemy tower）enemy.tower 期望21 实际25；enemy.wall 期望5 实际1 | 同样出错 |
| card_061 Lava Jewel（熔岩宝石） | +12 tower 6 damage to all enemies | （+12 tower and 6 normal damage to enemy; wall absorbs first）player.tower 期望32 实际26；enemy.tower 期望24 实际18 | 同样出错 |
| card_063 Crystallize（结晶化） | +11 tower -6 wall | （+11 tower and -6 wall）player.wall 期望2 实际8<br>（wall cannot go below 0）player.wall 期望0 实际3 | 同样出错 |
| card_064 Bag of Baubles（饰品袋） | if tower < enemy tower +2 tower, else +1 tower | （own tower is less than enemy tower, so +2 tower）player.tower 期望22 实际25<br>（own tower not less than enemy tower, so +1 tower）player.tower 期望26 实际29 | 同样出错 |
| card_065 Rainbow（彩虹） | +1 tower to all players. you gain 3 gems | （+1 tower to both players and +3 gems to self）enemy.tower 期望26 实际25 | 同样出错 |
| card_067 Lightning Shard（闪电碎片） | if tower > enemy wall, 8 damage to enemy tower, else 8 damage | （own tower > enemy wall, so 8 direct damage to enemy tower）enemy.tower 期望17 实际9<br>（own tower not greater than enemy wall, so 8 normal damage; enemy wall absorbs it）enemy.tower 期望25 实际17 | 同样出错 |
| card_069 MadCowDisease（疯牛病） | all players lose 6 recruits | （Both players lose 6 recruits; base no underflow.）player.beasts 期望6 实际0 | 同样出错 |
| card_075 Goblin Archers（地精弓箭手） | 3 damage to enemy tower you take 1 damage | （Direct enemy tower damage and self normal damage.）enemy.wall 期望5 实际4 | 同样出错 |
| card_086 Imp（小恶魔） | 6 damage. all players lose 5 bricks, gems, and recruits | （6 normal damage and both players lose 5 bricks, gems, recruits.）player.bricks 期望7 实际0；enemy.bricks 期望10 实际5 | 同样出错 |
| card_091 Elven Archers（精灵弓箭手） | if wall > enemy wall do 6 damage to enemy tower else do 6 damage | （Self wall > enemy wall triggers direct enemy tower damage.）enemy.tower 期望19 实际13；enemy.wall 期望5 实际2<br>（Self wall not greater triggers 6 normal damage.）enemy.tower 期望24 实际16 | 出错情况不同：（Self wall > enemy wall triggers direct enemy tower damage.）enemy.wall 期望5 实际2 / （Self wall not greater triggers 6 normal damage.）enemy.tower 期望24 实际19；enemy.wall 期望0 实际3 |
| card_094 Thief（盗贼） | enemy loses 10 gems, 5 bricks, you gain 1/2 amt. round up | （Enemy loses capped 10 gems and 5 bricks; self gains ceil halves.）enemy.gems 期望5 实际0 | 出错情况不同：（Enemy loses capped 10 gems and 5 bricks; self gains ceil halves.）player.gems 期望17 实际15；enemy.gems 期望5 实际0 / （Actual enemy losses are smaller; self gains ceil halves and enemy floors at 0.）player.gems 期望14 实际12 |
| card_098 Spearman（长矛兵） | if wall > enemy wall do 3 damage else do 2 damage | （Self wall > enemy wall triggers 3 normal damage.）enemy.tower 期望25 实际19<br>（Self wall not greater triggers 2 normal damage.）enemy.tower 期望25 实际22；enemy.wall 期望3 实际0 | 出错情况不同：（Self wall > enemy wall triggers 3 normal damage.）enemy.tower 期望25 实际24；enemy.wall 期望2 实际0 / （Self wall not greater triggers 2 normal damage.）enemy.tower 期望25 实际24；enemy.wall 期望3 实际0 |
| card_100 Berserker（狂战士） | 8 damage tower take 3 damage | （8 normal damage and direct 3 damage to own tower.）player.tower 期望17 实际20 | 同样出错 |
| card_101 Warlord（督军） | 13 damage lose 3 gems | （13 normal damage and self loses 3 gems.）player.gems 期望9 实际12<br>（Gem loss floors at 0.）player.gems 期望0 实际2 | 同样出错 |

## 只在 simulate.js 中出错的卡

| 卡 | 描述 | simulate.js 实际结果 |
|---|---|---|
| card_087 Spizzer | if enemy wall = 0, 10 damage, else 6 damage | （Base enemy wall is not 0, so 6 normal damage.）enemy.tower 期望24 实际10<br>（Enemy wall 0 triggers 10 normal damage.）enemy.tower 期望15 实际5 |
| card_089 Corrosion Cloud | if enemy wall > 0, 10 damage, else 7 damage | （Enemy wall > 0 triggers 10 normal damage.）enemy.tower 期望20 实际13<br>（Enemy wall 0 triggers 7 normal damage.）enemy.tower 期望18 实际8 |
| card_090 Unicorn | if magic > enemy magic, 12 damage, else 8 damage | （Self magic > enemy magic triggers 12 normal damage.）enemy.tower 期望18 实际6<br>（Magic not greater triggers 8 normal damage.）enemy.tower 期望22 实际10 |

## 不属于单张卡效果的 bug（已修复）

1. **敌人打出“再来一回合”卡之后游戏卡死**：`endActionSequence` 先 `setIsActionPhase(false)` 再立刻调用 `runAiTurn()`，但 `isActionPhaseRef` 要等下一次渲染才同步，所以 `runAiTurn` 直接返回，AI 永远不再行动（无头浏览器实测 main 分支可复现）。现在会同步更新这个 ref。
2. **棱镜 / 精灵斥候的随机弃牌**可能弃掉磁石（规则上不能弃），也可能弃掉正在打出的那张牌，导致手牌变成 7 张。现在两种情况都会排除。
3. **条件判断依赖卡名**：旧代码用 `effect.includes('mother lode' / 'foundations' / 'barracks' / 'bag of baubles' / 'flood water')`，但效果文本里根本没有卡名，导致这些分支永远不触发或被重复叠加。
4. 旧的 `runAutoplay` 和 `simulate.js` 各自维护一份规则副本，牌库补充时只放 1 份牌（游戏里是 2 份）。现在全部统一走 `src/engine`。

## 需要确认的卡牌含义

- **card_032 兵营（Barracks）**：英文 `+6 recruits, +6 wall if dungeon < enemy dungeon, +1 dungeon` 有歧义；中文写的是“若地下城<敌人则 +6 高墙”。目前采用 Arcomage 原版含义：**+6 新兵、+6 高墙，若地下城 < 敌人地下城则 +1 地下城**。（旧游戏实际效果是三项都无条件生效。）
- **card_094 盗贼（Thief）**：中文写“获得它们的一半产量”，按英文实现为“获得敌人**实际失去**数量的一半，向上取整”。
- **card_061 熔岩宝石（Lava Jewel）** “6 damage to all enemies”：按普通伤害（先打墙）只打敌人；旧代码会同时打自己和敌人的塔。
- 棱镜 / 精灵斥候在原版里是玩家**自己选**弃哪张，这里沿用随机弃牌（保持 UI 不变）。
