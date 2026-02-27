"""
Arcomage Card Power Analyzer
=============================
战力/价值模型分析器。自动读取 src/cards.json，
用正则解析效果文本，为每张卡打出"净价值分"。

模型公式:
  Net Value = sum(Outputs) - ActionCost - ResourceCost

积分权重 (可在 WEIGHTS 字典中调整):
  - 每1费资源消耗       : -1.0 pt
  - 打出任意1张卡行动消耗: -2.0 pt (统一基准)
  - +1 Wall             : +0.75 pt
  - +1 Tower            : +0.85 pt
  - 1 Damage            : +0.65 pt (可能被墙拦截，贬值)
  - Direct Tower Damage : +0.9  pt (穿墙攻塔，溢价)
  - +1 Production(Q/M/D): +3.0  pt
  - -1 Enemy Production : +3.5  pt (破坏 > 建设)
  - +1 单次资源获得     : +0.9  pt
  - -1 己方单次资源     : -0.9  pt
  - -1 敌方单次资源     : +0.5  pt (敌方失去资源折半价值)
  - Play Again          : +2.0  pt (抵消行动消耗)
  - Draw/Discard        : +0.5  pt (手牌优势)
  - 高费溢价 (每费)     : +0.08 pt (节省行动力的规模溢价)
"""

import json
import re
import os
import sys
from pathlib import Path

# 强制 stdout 使用 UTF-8 (兼容 Windows GBK 终端)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ─── 权重配置 ──────────────────────────────────────────────────────────────────
WEIGHTS = {
    "action_cost":         -2.0,   # 打出任意卡牌本身消耗
    "resource_cost":       -1.0,   # 每1点资源消耗
    "wall":                +0.75,  # +1 Wall
    "tower":               +0.85,  # +1 Tower
    "damage":              +0.65,  # 1点普通伤害(先打墙)
    "tower_damage":        +0.90,  # 1点直接塔伤害(穿墙)
    "production_own":      +3.0,   # +1 己方产能 (quarry/magic/dungeon)
    "production_enemy":    -3.5,   # -1 己方产能 (被对手削弱)
    "production_enemy_de": +3.5,   # -1 敌方产能 (我方削弱对手)
    "resource_gain":       +0.9,   # +1 单次资源获得
    "resource_lose":       -0.9,   # -1 己方单次资源失去
    "resource_enemy_lose": +0.5,   # 敌方失去1点资源 (不确定性折半)
    "play_again":          +2.0,   # 再来一回合
    "draw_discard":        +0.5,   # 抽/弃牌
    "high_cost_premium":   +0.08,  # 高费卡规模溢价/每费 (>6费时生效)
}

# ─── 效果解析引擎 ───────────────────────────────────────────────────────────────
class EffectParser:
    """
    用正则表达式从英文效果文本中提取数值信号。
    返回一个{维度: 数值}的字典。
    """

    def parse(self, effect: str) -> dict:
        e = effect.lower()
        signals = {}

        # ── 己方正面 ──────────────────────────────────────────────────────────
        # +N Wall
        for m in re.finditer(r'\+(\d+)\s*wall', e):
            signals['wall'] = signals.get('wall', 0) + int(m.group(1))

        # +N Tower
        for m in re.finditer(r'\+(\d+)\s*tower', e):
            signals['tower'] = signals.get('tower', 0) + int(m.group(1))

        # +N Quarry (己方)
        for m in re.finditer(r'\+(\d+)\s*quarry', e):
            signals['production_own'] = signals.get('production_own', 0) + int(m.group(1))

        # +N Magic (己方)
        for m in re.finditer(r'\+(\d+)\s*magic', e):
            signals['production_own'] = signals.get('production_own', 0) + int(m.group(1))

        # +N Dungeon (己方)
        for m in re.finditer(r'\+(\d+)\s*dungeon', e):
            signals['production_own'] = signals.get('production_own', 0) + int(m.group(1))

        # +N bricks / gems / recruits (单次资源获得)
        for m in re.finditer(r'\+(\d+)\s*(bricks?|gems?|recruits?|gem)', e):
            signals['resource_gain'] = signals.get('resource_gain', 0) + int(m.group(1))

        # you gain N bricks/gems/recruits
        for m in re.finditer(r'you gain (\d+)\s*(bricks?|gems?|recruits?)', e):
            signals['resource_gain'] = signals.get('resource_gain', 0) + int(m.group(1))

        # gain N bricks/gems/recruits (不带you)
        for m in re.finditer(r'(?<!\w)gain (\d+)\s*(bricks?|gems?|recruits?)', e):
            signals['resource_gain'] = signals.get('resource_gain', 0) + int(m.group(1))

        # Play again
        if 'play again' in e:
            signals['play_again'] = 1

        # draw / discard (手牌调整)
        if re.search(r'draw \d+ card', e) or re.search(r'discard \d+ card', e):
            signals['draw_discard'] = 1

        # ── 己方负面 ──────────────────────────────────────────────────────────
        # you lose N / lose N (己方失去资源) - 注意: 要排除 "all players lose" 和 "enemy loses" 情况
        for m in re.finditer(
            r'(?:you lose|you lose) (\d+)\s*(bricks?|gems?|recruits?)', e
        ):
            signals['resource_lose'] = signals.get('resource_lose', 0) - int(m.group(1))

        # "lose N gems/bricks/recruits" without "you" prefix but also not "enemy" or "all players"
        for m in re.finditer(r'(?<![a-z])lose (\d+)\s*(bricks?|gems?|recruits?)', e):
            pre = e[max(0, m.start()-20):m.start()]
            if 'enemy' not in pre and 'all player' not in pre and 'you' not in pre:
                signals['resource_lose'] = signals.get('resource_lose', 0) - int(m.group(1))

        # lose N production (己方产能削减)
        for m in re.finditer(r'-(\d+)\s*quarry(?! of | enemy)', e):
            # 只匹配己方 quarry 减少，排除 "enemy quarry"
            # 检查是否是己方
            context_start = max(0, m.start() - 10)
            context = e[context_start:m.end()]
            if 'enemy' not in context:
                signals['production_enemy'] = signals.get('production_enemy', 0) - int(m.group(1))

        for m in re.finditer(r'-(\d+)\s*magic(?!\s*\>|\s*=)', e):
            context_start = max(0, m.start() - 10)
            context = e[context_start:m.end()]
            if 'enemy' not in context and 'all' not in context:
                signals['production_enemy'] = signals.get('production_enemy', 0) - int(m.group(1))

        # -N Wall (己方墙减少，如 Crystallize)
        for m in re.finditer(r'-(\d+)\s*wall', e):
            context_start = max(0, m.start() - 10)
            context = e[context_start:m.end()]
            if 'enemy' not in context:
                signals['wall'] = signals.get('wall', 0) - int(m.group(1))

        # ── 对敌伤害 ──────────────────────────────────────────────────────────
        # N damage to enemy tower (直接塔伤)
        for m in re.finditer(r'(\d+)\s*damage to (?:enemy |all )?tower', e):
            signals['tower_damage'] = signals.get('tower_damage', 0) + int(m.group(1))

        # 12 damage to enemy (后面没有 tower 的，判定为普通damage)
        for m in re.finditer(r'(\d+)\s*damage to enemy(?!\s*tower)', e):
            signals['damage'] = signals.get('damage', 0) + int(m.group(1))

        # 4 damage to all enemy towers
        for m in re.finditer(r'(\d+)\s*damage to all enemy towers?', e):
            signals['tower_damage'] = signals.get('tower_damage', 0) + int(m.group(1))

        # N damage (无 to tower/to enemy, 是普通穿墙damage)
        # 排除已匹配的情况
        bare_damage = re.findall(r'(\d+)\s*damage(?!\s+to)', e)
        # 需要确认不是 "to your tower" / "you take N damage" (己方受伤)
        for m in re.finditer(r'(\d+)\s*damage(?!\s+to)', e):
            # 检查前文
            pre = e[max(0, m.start()-20):m.start()]
            if 'your tower take' in pre or 'tower take' in pre:
                # 己方塔受伤
                signals['tower_damage_self'] = signals.get('tower_damage_self', 0) - int(m.group(1))
            elif 'you take' in pre or 'you take' in e[max(0,m.start()-10):m.start()]:
                signals['tower_damage_self'] = signals.get('tower_damage_self', 0) - int(m.group(1))
            else:
                signals['damage'] = signals.get('damage', 0) + int(m.group(1))

        # you take N damage / tower take N damage (己方受到伤害)
        for m in re.finditer(r'(?:you take|tower take[s]?)\s*(\d+)\s*damage', e):
            signals['tower_damage_self'] = signals.get('tower_damage_self', 0) - int(m.group(1))

        # ── 对敌方资源/产能削减 ──────────────────────────────────────────────
        # enemy loses N bricks/gems/recruits
        for m in re.finditer(r'enemy (?:loses?|lose) (\d+)\s*(bricks?|gems?|recruits?)', e):
            signals['resource_enemy_lose'] = signals.get('resource_enemy_lose', 0) + int(m.group(1))

        # 对敌产能削减：用统一的正则，只匹配一次，避免重复
        # 匹配 "-N enemy quarry", "-N enemy dungeon", "enemy loses N quarry"
        seen_enemy_production_pos = set()
        for m in re.finditer(
            r'(?:-(\d+)\s*enemy\s*(quarry|dungeon)'
            r'|enemy\s+lose[s]?\s+(\d+)\s*(quarry|dungeon))', e
        ):
            if m.start() in seen_enemy_production_pos:
                continue
            seen_enemy_production_pos.add(m.start())
            val = int(m.group(1) or m.group(3))
            signals['production_enemy_de'] = signals.get('production_enemy_de', 0) + val

        # ── 全玩家效果 ─────────────────────────────────────────────────────────
        # all players lose N bricks/gems/recruits
        for m in re.finditer(r'all players? (?:lose|loses) (\d+)\s*(bricks?|gems?|recruits?)', e):
            # 自己也受影响，净收益:对敌价值(0.5) - 己方亏损(0.9)
            val = int(m.group(1))
            signals['resource_lose'] = signals.get('resource_lose', 0) - val
            signals['resource_enemy_lose'] = signals.get('resource_enemy_lose', 0) + val

        # all player's quarry -1 (如 Earthquake)
        if re.search(r'all player.{0,5}quarry.{0,5}-1|-1 to all player.{0,5}quarr', e):
            signals['production_enemy'] = signals.get('production_enemy', 0) - 1
            signals['production_enemy_de'] = signals.get('production_enemy_de', 0) + 1

        # all player's dungeon +1 (如 Full Moon) - 己方获益，但给了对手
        if re.search(r'\+1 to all player.{0,10}dungeon', e):
            signals['production_own'] = signals.get('production_own', 0) + 1
            signals['production_enemy_de'] = signals.get('production_enemy_de', 0) - 1  # 给了对手，抵消

        # +1 magic/dungeon/quarry to all
        if re.search(r'\+1 to all player.{0,10}quarry', e):
            signals['production_own'] = signals.get('production_own', 0) + 1
            signals['production_enemy_de'] = signals.get('production_enemy_de', 0) - 1

        # 7 damage to all towers
        for m in re.finditer(r'(\d+)\s*damage to all tower', e):
            signals['damage'] = signals.get('damage', 0) + int(m.group(1))
            signals['tower_damage_self'] = signals.get('tower_damage_self', 0) - int(m.group(1))

        # ── 条件效果修正 ──────────────────────────────────────────────────────
        # 条件大小伤害：if ... N damage ... else M damage
        # 由于上面的裸 damage 正则已将两分支都累加进去，这里修正为平均值
        m = re.search(r'if.+?(\d+)\s*damage.+?else\s*(\d+)\s*damage', e)
        if m:
            v1, v2 = int(m.group(1)), int(m.group(2))
            avg = (v1 + v2) / 2
            # 上面已经把 v1 和 v2 都加进 damage，需要减去多余的重算
            # 实际上裸 damage 匹配已经累加了两个值，但 "else M damage" 中 M 不会被
            # bare_damage 匹配（因为 else 后的 damage 仍被 r'(\d+)\s*damage(?!\s+to)' 匹配）
            # 清空 damage 并重设为平均值
            signals['damage'] = avg
            # 同理清空可能误计的 tower_damage_self 和 tower_damage
            # (条件伤害不涉及己方受伤，保持不变)

        # if quarry < enemy quarry, quarry = enemy quarry -> 期望约+1.5产能
        if 'quarry = enemy quarry' in e:
            signals['production_own'] = signals.get('production_own', 0) + 1.5

        return signals


# ─── 战力计算引擎 ──────────────────────────────────────────────────────────────
class CardScorer:
    def __init__(self, weights=None):
        self.w = weights or WEIGHTS
        self.parser = EffectParser()

    def score(self, card: dict) -> dict:
        cost = card.get('cost', 0)
        effect = card.get('effect', '')
        signals = self.parser.parse(effect)

        # --- 计算各部分得分 ---
        base_input = self.w['action_cost'] + cost * self.w['resource_cost']

        output = 0
        breakdown = {}

        for key, val in signals.items():
            if key in self.w:
                pts = val * self.w[key]
                if pts != 0:
                    breakdown[key] = round(pts, 2)
                output += pts

        # 高费溢价 (费用 > 6 的卡，每1费额外 +0.08)
        if cost > 6:
            premium = (cost - 6) * self.w['high_cost_premium']
            breakdown['high_cost_premium'] = round(premium, 2)
            output += premium

        # 己方塔受伤
        if 'tower_damage_self' in signals:
            pts = signals['tower_damage_self'] * self.w['tower_damage']
            breakdown['tower_damage_self (tower取负)'] = round(pts, 2)
            output += pts

        net = base_input + output
        return {
            'name':      card['name'],
            'name_zh':   card.get('name_zh', ''),
            'id':        card['id'],
            'color':     card['color'],
            'cost':      cost,
            'effect':    effect,
            'signals':   signals,
            'input_pts': round(base_input, 2),
            'output_pts':round(output, 2),
            'breakdown': breakdown,
            'net_value': round(net, 2),
        }


# ─── 输出格式化 ───────────────────────────────────────────────────────────────
COLOR_MARK = {'Red': '[R]', 'Blue': '[B]', 'Green': '[G]'}

def print_table(results: list, title: str, top_n: int = None):
    data = results[:top_n] if top_n else results
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")
    print(f"{'RNK':>4}  {'CLR':>4}  {'COST':>4}  {'NET':>7}  {'Card Name':<24}  Chinese")
    print(f"{'-'*70}")
    for i, r in enumerate(data, 1):
        mk = COLOR_MARK.get(r['color'], '[ ]')
        print(
            f"{i:>4}. {mk}  {r['cost']:>4}c  {r['net_value']:>+7.2f}  "
            f"{r['name']:<24}  {r['name_zh']}"
        )

def print_detail(result: dict):
    mk = COLOR_MARK.get(result['color'], '[ ]')
    print(f"\n{'-'*60}")
    print(f"  {mk} [{result['name']}] {result['name_zh']}  (Cost: {result['cost']})")
    print(f"  Effect: {result['effect']}")
    print(f"  - Signals   : {result['signals']}")
    print(f"  - Input pts : {result['input_pts']:+.2f} pt")
    print(f"  - Output pts: {result['output_pts']:+.2f} pt")
    if result['breakdown']:
        for k, v in result['breakdown'].items():
            print(f"      [{k:30s}]: {v:+.2f}")
    label = '>>> OVERTUNED <<<' if result['net_value'] > 0 else 'balanced' if result['net_value'] > -3 else 'strategic/niche'
    print(f"  = Net Value: {result['net_value']:+.2f} pt  [{label}]")


# ─── 主函数 ───────────────────────────────────────────────────────────────────
def main():
    # 找到 cards.json 路径 (工具脚本在 tools/ 下，cards.json 在 src/ 下)
    script_dir = Path(__file__).parent
    cards_path = script_dir.parent / 'src' / 'cards.json'

    if not cards_path.exists():
        print(f"[ERROR] cards.json not found: {cards_path}")
        return

    with open(cards_path, encoding='utf-8') as f:
        cards = json.load(f)

    print(f"[OK] Loaded {len(cards)} cards from cards.json")

    scorer = CardScorer()
    results = [scorer.score(c) for c in cards]

    # 按净价值从高到低排序
    results.sort(key=lambda x: x['net_value'], reverse=True)

    # ── 全榜输出 ──
    print_table(results, "[ALL] Full Card Power Ranking (by Net Value desc)")

    # ── 分色榜 ──
    for color in ['Red', 'Blue', 'Green']:
        color_results = [r for r in results if r['color'] == color]
        print_table(color_results, f"{COLOR_MARK[color]} {color} Deck Power Ranking", top_n=15)

    # ── 超模卡 (净分 > 0) ──
    overtuned = [r for r in results if r['net_value'] > 0]
    if overtuned:
        print(f"\n{'='*70}")
        print(f"  [OVERTUNED] Net Value > 0  ({len(overtuned)} cards)")
        print(f"{'='*70}")
        for r in overtuned:
            print_detail(r)

    # ── 战略卡 (净分 < -5) ──
    strategic = [r for r in results if r['net_value'] < -5]
    strategic.sort(key=lambda x: x['net_value'])
    print(f"\n{'='*70}")
    print(f"  [STRATEGIC] Net Value < -5  ({len(strategic)} cards - niche/tactical)")
    print(f"{'='*70}")
    print("  These cards have net negative scores but serve unique tactical roles:")
    for r in strategic:
        mk = COLOR_MARK.get(r['color'], '')
        print(f"    {mk} {r['name']:<24} ({r['name_zh']})  net: {r['net_value']:+.2f}  -> {r['effect']}")

    # ── 费效比(净分/费用) ──
    print(f"\n{'='*70}")
    print(f"  [EFFICIENCY] Net Value / Cost  (0-cost cards excluded)")
    print(f"{'='*70}")
    ratio_results = [r for r in results if r['cost'] > 0]
    for r in ratio_results:
        r['ratio'] = r['net_value'] / r['cost']
    ratio_results.sort(key=lambda x: x['ratio'], reverse=True)
    print("\n  >>> Best Efficiency Top-10:")
    for r in ratio_results[:10]:
        print(f"    {COLOR_MARK.get(r['color'],'')} {r['name']:<24} net:{r['net_value']:+.2f} / {r['cost']}c = ratio:{r['ratio']:+.2f}")
    print("\n  <<< Worst Efficiency Bottom-10:")
    for r in ratio_results[-10:]:
        print(f"    {COLOR_MARK.get(r['color'],'')} {r['name']:<24} net:{r['net_value']:+.2f} / {r['cost']}c = ratio:{r['ratio']:+.2f}")

    # ── 导出 JSON ──
    output_path = script_dir / 'card_power_results.json'
    export = [
        {
            'rank': i+1,
            'id':   r['id'],
            'name': r['name'],
            'name_zh': r['name_zh'],
            'color': r['color'],
            'cost': r['cost'],
            'effect': r['effect'],
            'net_value': r['net_value'],
            'input_pts': r['input_pts'],
            'output_pts': r['output_pts'],
            'breakdown': r['breakdown'],
        }
        for i, r in enumerate(results)
    ]
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export, f, ensure_ascii=False, indent=2)
    print(f"\n[DONE] Full results exported to: {output_path}")

    # ── 权重调整提示 ──
    print(f"""
{'='*70}
  HOW TO CALIBRATE THE MODEL:
{'='*70}
  1. Review the rankings above.
     If a card you consider strong ranks too low, tell the AI to adjust weights.
  2. Tunable parameters (WEIGHTS dict at top of this file):
     - production_own / production_enemy_de  : value of building/destroying production
     - play_again                            : value of extra turn
     - damage / tower_damage                 : value of dealing damage
  3. Re-run the script after any change to see updated rankings.
""")


if __name__ == '__main__':
    main()
