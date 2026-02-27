import React, { useState, useEffect } from 'react';
import { FloatingNumbers } from './components/FloatingNumbers';
import Card from './components/Card';
import Menu from './components/Menu';
import CardCollection from './components/CardCollection';
import { useGameState, canAfford } from './useGameState';
import { translations } from './i18n';
import './ActionLog.css';
import './App.css';

// ── Responsive scale: fit-inside the viewport, no cropping ──────────────────
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

function useViewportScale() {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const compute = () => {
            const s = Math.min(
                window.innerWidth / DESIGN_WIDTH,
                window.innerHeight / DESIGN_HEIGHT
            );
            setScale(s);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);
    return scale;
}

// ── Structure visual (tower / wall bar) ─────────────────────────────────────
const Structure = ({ type, height, label }) => {
    const pct = Math.min((height / 50) * 100, 100);
    return (
        <div className={`structure-visual ${type}`}>
            <div className="structure-header">
                <span className="structure-label">{label}</span>
                <div className={`structure-badge ${type}-badge`} style={{ position: 'relative' }}>
                    <span className="badge-value">{height}</span>
                    <FloatingNumbers value={height} />
                </div>
            </div>
            <div className="structure-frame">
                <div className="bars-container">
                    <div className={`structure-bar ${type}-bar`} style={{ height: `${pct}%` }}>
                        <div className="bar-cap" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Horizontal compact resource bar ─────────────────────────────────────────
const HorizResItem = ({ producer, amount, producerLabel, amountLabel, color }) => (
    <div className={`horiz-res-item horiz-res-${color}`}>
        <div className={`horiz-dot dot-${color}`} />
        <div className="horiz-res-nums">
            <span className="horiz-producer" title={producerLabel}>{producer}</span>
            <span className="horiz-arrow">›</span>
            <span className="horiz-amount" title={amountLabel}>{amount}</span>
        </div>
        <div className="horiz-res-labels">
            <span>{producerLabel}</span>
            <span>{amountLabel}</span>
        </div>
    </div>
);

const HorizResourceBar = ({ state, isEnemy, t }) => (
    <div className={`horiz-resource-bar ${isEnemy ? 'enemy-bar' : 'player-bar'}`}>
        <span className="bar-side-label">{isEnemy ? t.enemy : t.player}</span>
        <div className="horiz-res-items">
            <HorizResItem color="red" producer={state.quarries} amount={state.bricks} producerLabel={t.quarries} amountLabel={t.bricks} />
            <HorizResItem color="blue" producer={state.magic} amount={state.gems} producerLabel={t.magic} amountLabel={t.gems} />
            <HorizResItem color="green" producer={state.dungeon} amount={state.beasts} producerLabel={t.dungeon} amountLabel={t.recruits} />
        </div>
    </div>
);

// ── Top bar: avatars + vitals + title + turn status ──────────────────────────
const TopBar = ({ playerState, enemyState, winner, isPlayerTurn, language, t, resetGame }) => (
    <div className="top-bar">
        {/* Enemy side */}
        <div className="player-header enemy-header">
            <div className="avatar-portrait enemy-avatar">🔥</div>
            <div className="header-info">
                <span className="header-name">{t.enemy}</span>
                <div className="header-vitals">
                    <span className="vital">
                        🏰 <b style={{ position: 'relative' }}>{enemyState.tower}<FloatingNumbers value={enemyState.tower} /></b>
                    </span>
                    <span className="vital">
                        🛡 <b style={{ position: 'relative' }}>{enemyState.wall}<FloatingNumbers value={enemyState.wall} /></b>
                    </span>
                </div>
            </div>
        </div>

        {/* Center */}
        <div className="game-status-center">
            <h1 className="citadel-title">{t.gameName}</h1>
            {winner ? (
                <div className="winner-block">
                    <span className="winner-text">
                        {winner === 'DRAW'
                            ? (language === 'zh' ? '平局！' : 'DRAW!')
                            : winner === 'PLAYER' ? t.playerWins : t.enemyWins}
                    </span>
                    <button className="btn-reset" onClick={resetGame}>{t.playAgain}</button>
                </div>
            ) : (
                <div className={`turn-badge ${isPlayerTurn ? 'your-turn' : 'enemy-turn'}`}>
                    {isPlayerTurn ? t.yourTurn : t.enemyTurn}
                </div>
            )}
        </div>

        {/* Player side */}
        <div className="player-header you-header">
            <div className="header-info header-info-right">
                <span className="header-name">{t.player}</span>
                <div className="header-vitals">
                    <span className="vital">
                        🏰 <b style={{ position: 'relative' }}>{playerState.tower}<FloatingNumbers value={playerState.tower} /></b>
                    </span>
                    <span className="vital">
                        🛡 <b style={{ position: 'relative' }}>{playerState.wall}<FloatingNumbers value={playerState.wall} /></b>
                    </span>
                </div>
            </div>
            <div className="avatar-portrait player-avatar">⚔️</div>
        </div>
    </div>
);

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
    const [language, setLanguage] = useState('en');
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const scale = useViewportScale();
    const t = translations[language];
    const {
        playerState, enemyState, playerHand, enemyHand,
        isPlayerTurn, winner, log, playCard, discardCard,
        resetGame, activeCard, exportDebugLog
    } = useGameState();

    const formatLog = (logObj) => {
        if (!logObj || typeof logObj === 'string') return logObj;
        const actor = logObj.isPlayer ? t.player : t.enemy;
        const cName = logObj.card ? (language === 'zh' ? logObj.card.name_zh : logObj.card.name) : '';
        switch (logObj.type) {
            case 'start': return language === 'zh' ? '游戏开始！' : 'Game Started!';
            case 'not_enough': return language === 'zh' ? `资源不足，无法打出 ${cName}!` : `Not enough resources for ${cName}!`;
            case 'played': return `${actor} ${language === 'zh' ? '打出' : 'played'} ${cName}.`;
            case 'discarded': return `${actor} ${language === 'zh' ? '弃牌' : 'discarded'} ${cName}.`;
            case 'play_again': return `${actor} ${language === 'zh' ? '获得额外回合!' : 'gets to play again!'}`;
            default: return '';
        }
    };

    const boardStyle = {
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        overflow: 'hidden',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a0f05', overflow: 'hidden',
        }}>
            <div className="game-board" style={boardStyle}>

                {/* CardCollection modal */}
                {isCollectionOpen && (
                    <CardCollection onClose={() => setIsCollectionOpen(false)} language={language} t={t} />
                )}

                {/* ① TOP BAR */}
                <TopBar
                    playerState={playerState}
                    enemyState={enemyState}
                    winner={winner}
                    isPlayerTurn={isPlayerTurn}
                    language={language}
                    t={t}
                    resetGame={resetGame}
                />

                {/* ② BATTLEFIELD */}
                <div className="battlefield">
                    <div className="tower-area player-tower-area">
                        <Structure type="tower" height={playerState.tower} label={t.tower} />
                        <Structure type="wall" height={playerState.wall} label={t.wall} />
                    </div>

                    <div className="center-action-area">
                        <div className="action-log">
                            {log.map((msg, i) => (
                                <div key={i} className="log-msg" style={{ opacity: 1 - i * 0.15 }}>
                                    {formatLog(msg)}
                                </div>
                            ))}
                        </div>
                        {activeCard && (
                            <div className="active-card-presentation">
                                <Card card={activeCard} isEnemy={false} language={language} t={t} />
                            </div>
                        )}
                    </div>

                    <div className="tower-area enemy-tower-area">
                        <Structure type="wall" height={enemyState.wall} label={t.wall} />
                        <Structure type="tower" height={enemyState.tower} label={t.tower} />
                    </div>
                </div>

                {/* ③ ENEMY RESOURCE BAR */}
                <HorizResourceBar state={enemyState} isEnemy={true} t={t} />

                {/* ④ PLAYER RESOURCE BAR */}
                <HorizResourceBar state={playerState} isEnemy={false} t={t} />

                {/* ⑤ HAND ROW */}
                <div className="hand-row">
                    <div className="discard-hint">
                        💡 {language === 'zh' ? '右键点击卡牌丢弃（跳过回合）' : 'Right-click a card to discard (skip turn)'}
                    </div>
                    <div className="player-hand">
                        {playerHand.map((c) => (
                            <div key={c.uid} className={`card-wrapper ${!canAfford(c, playerState) ? 'unaffordable' : ''}`}>
                                <Card
                                    card={c}
                                    isEnemy={false}
                                    language={language}
                                    t={t}
                                    playerState={playerState}
                                    onPlay={(card) => playCard(card, true)}
                                    onDiscard={(card) => discardCard(card, true)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Menu floats bottom-right */}
                <Menu
                    language={language}
                    setLanguage={setLanguage}
                    t={t}
                    onOpenCollection={() => setIsCollectionOpen(true)}
                    onExportDebug={exportDebugLog}
                    onNewGame={resetGame}
                />
            </div>
        </div>
    );
}

export default App;
