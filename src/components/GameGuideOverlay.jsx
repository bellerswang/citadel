import React, { useState, useEffect, useCallback } from 'react';
import './GameGuideOverlay.css';

const STEPS = [
    {
        id: 0,
        titleZh: '欢迎来到 堡垒！',
        titleEn: 'Welcome to Citadel!',
        textZh: '这是一款回合制卡牌对战游戏。\n\n🏆 胜利条件：将你的【高塔】建设至 50，或者摧毁敌方的【高塔】使其降至 0。\n\n⚔️ 规则：双方玩家轮流出牌，每回合打出或弃置恰好 1 张牌，然后自动补牌至 6 张。策略与时机是获胜的关键！',
        textEn: 'A turn-based card battle game.\n\n🏆 Win Conditions: Build your [Tower] to 50, OR destroy the enemy\'s [Tower] to 0.\n\n⚔️ Rules: Players alternate turns. Play or discard 1 card per turn, then draw back to 6. Strategy is key!',
        anchor: null,
    },
    {
        id: 1,
        titleZh: '玩家信息',
        titleEn: 'Player Info',
        textZh: '左上角显示你的名字和头像，代表你的阵营。头像框颜色为金色，表示这是玩家方。',
        textEn: 'Your name and avatar are in the top-left, marking your side. The gold border identifies the Player.',
        anchor: { x: 120, y: 50 },
    },
    {
        id: 2,
        titleZh: '敌方信息',
        titleEn: 'Enemy Info',
        textZh: '右上角显示敌方（AI）的名字 and 头像，头像框为红色。AI 会自动在每回合结束后立即出牌。',
        textEn: 'The enemy (AI) name and avatar appear top-right with a red border. The AI acts immediately after your turn ends.',
        anchor: { x: 1160, y: 50 },
    },
    {
        id: 3,
        titleZh: '我方资源',
        titleEn: 'Your Resources',
        textZh: '左侧面板显示你的三类资源：砖块、宝石、新兵。大数字是当前量，下方 "+N" 是每回合产量。',
        textEn: 'The left panel shows your Resources: Bricks, Gems, and Recruits. Large number is stock; "+N" is production.',
        anchor: { x: 80, y: 410 },
    },
    {
        id: 4,
        titleZh: '敌方资源',
        titleEn: 'Enemy Resources',
        textZh: '右侧显示敌方资源。学会观察敌方资源可以预判其动作！',
        textEn: 'Mirrors enemy resources. Watching these helps predict their next move!',
        anchor: { x: 1200, y: 410 },
    },
    {
        id: 5,
        titleZh: '我方要塞',
        titleEn: 'Your Citadel',
        textZh: '🗼 高塔：建到 50 获胜。\n🧱 城墙：吸收伤害，保护高塔。',
        textEn: '🗼 Tower: reach 50 to win.\n🧱 Wall: absorbs damage to protect the Tower.',
        anchor: { x: 300, y: 520 },
    },
    {
        id: 6,
        titleZh: '敌方要塞',
        titleEn: 'Enemy Citadel',
        textZh: '你的攻击目标！建议先拆城墙，再打高塔。',
        textEn: 'Your targets! Break the Wall first, then destroy the Tower.',
        anchor: { x: 980, y: 520 },
    },
    {
        id: 7,
        titleZh: '中央行动区',
        titleEn: 'Action Center',
        textZh: '中央显示本轮出的牌和其效果，以及行动日志信息。',
        textEn: 'Shows the card played this turn, card effects, and the central message log.',
        anchor: { x: 640, y: 370 },
    },
    {
        id: 8,
        titleZh: '手牌区',
        titleEn: 'Card Hand',
        textZh: '持有 6 张牌。左键打出，右键弃牌。资源不足时卡牌会变灰。',
        textEn: 'You hold 6 cards. Left-click to play, right-click to discard. Cards gray out if unaffordable.',
        anchor: { x: 640, y: 730 },
    },
    {
        id: 9,
        titleZh: '战斗报告',
        titleEn: 'Combat Log',
        textZh: '记录出牌历史。鼠标悬停在卡牌记录上可查看卡牌预览。',
        textEn: 'History of actions. Hover over played cards in the log to preview them.',
        anchor: { x: 100, y: 790 },
    },
    {
        id: 10,
        titleZh: '菜单',
        titleEn: 'Menu',
        textZh: '在此可切换语言、查看完整卡牌图库或重新开始。',
        textEn: 'Open to toggle language, view Card Gallery, or restart the game.',
        anchor: { x: 920, y: 820 },
    },
];

const GameGuideOverlay = ({ onClose, language }) => {
    const [step, setStep] = useState(0);
    const total = STEPS.length;
    const current = STEPS[step];
    const isLast = step === total - 1;

    const handleNext = useCallback((e) => {
        e.stopPropagation();
        if (isLast) { onClose(); return; }
        setStep(s => s + 1);
    }, [isLast, onClose]);

    const handlePrev = useCallback((e) => {
        e.stopPropagation();
        setStep(s => Math.max(0, s - 1));
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const title = language === 'zh' ? current.titleZh : current.titleEn;
    const text = language === 'zh' ? current.textZh : current.textEn;

    return (
        <div className="guide-overlay" onClick={onClose}>
            <div className="guide-backdrop" />

            {/* Guide Anchor (Option 3) */}
            {current.anchor && (
                <div
                    className="guide-anchor-ring"
                    style={{ left: current.anchor.x, top: current.anchor.y }}
                >
                    <div className="guide-anchor-ping" />
                    <div className="guide-anchor-arrow">▼</div>
                </div>
            )}

            <div className="guide-step-card" onClick={e => e.stopPropagation()}>
                <div className="guide-step-header">
                    <span className="guide-step-title">{title}</span>
                    <span className="guide-step-progress">{step + 1} / {total}</span>
                </div>

                <div className="guide-step-body">
                    {text.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                <div className="guide-nav">
                    <button className="guide-nav-btn" onClick={handlePrev} disabled={step === 0}>
                        {language === 'zh' ? '← 上一步' : '← Prev'}
                    </button>

                    <div className="guide-dots">
                        {STEPS.map((_, i) => (
                            <span
                                key={i}
                                className={`guide-dot ${i === step ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setStep(i); }}
                            />
                        ))}
                    </div>

                    <button className="guide-nav-btn primary" onClick={handleNext}>
                        {isLast ? (language === 'zh' ? '完成 ✓' : 'Done ✓') : (language === 'zh' ? '下一步 →' : 'Next →')}
                    </button>
                </div>

                <div className="guide-dismiss-hint">
                    {language === 'zh' ? '按 Esc 或点击背景关闭' : 'Press Esc or click outside to close'}
                </div>
            </div>
        </div>
    );
};

export default GameGuideOverlay;
