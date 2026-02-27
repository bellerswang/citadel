import React, { useState, useEffect } from 'react';
import { FloatingNumbers } from './components/FloatingNumbers';
import Card from './components/Card';
import Menu from './components/Menu';
import CardCollection from './components/CardCollection';
import { useGameState, canAfford } from './useGameState';
import { translations } from './i18n';
import './ActionLog.css';
import './App.css';

// ── Responsive scale ────────────────────────────────────────────────────────
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

// ── Castle Structure Visual (Tower + Wall side-by-side) ─────────────────────
// Mockup shows two small towers stacked vertically per side.
const CastleColumn = ({ state, isEnemy }) => {
    const towerPct = Math.min((state.tower / 50) * 100, 100);
    const wallPct = Math.min((state.wall / 50) * 100, 100);

    return (
        <div className={`castle-column ${isEnemy ? 'enemy-side' : 'player-side'}`}>
            <div className={`stone-row ${isEnemy ? 'row-left' : 'row-right'}`}>
                {isEnemy ? (
                    <>
                        <div className="stone-tower-placeholder"></div>
                        <div className="fill-bar-container"><div className="fill-bar tower-fill" style={{ height: `${towerPct}%` }}><div className="bar-cap" /></div></div>
                    </>
                ) : (
                    <>
                        <div className="fill-bar-container"><div className="fill-bar tower-fill" style={{ height: `${towerPct}%` }}><div className="bar-cap" /></div></div>
                        <div className="stone-tower-placeholder"></div>
                    </>
                )}
            </div>

            <div className={`stone-row ${isEnemy ? 'row-left' : 'row-right'}`}>
                {isEnemy ? (
                    <>
                        <div className="stone-tower-placeholder"></div>
                        <div className="fill-bar-container"><div className="fill-bar wall-fill" style={{ height: `${wallPct}%` }}><div className="bar-cap" /></div></div>
                    </>
                ) : (
                    <>
                        <div className="fill-bar-container"><div className="fill-bar wall-fill" style={{ height: `${wallPct}%` }}><div className="bar-cap" /></div></div>
                        <div className="stone-tower-placeholder"></div>
                    </>
                )}
            </div>
        </div>
    );
};

// ── Horizontal Resource Bar ──────────────────────────────────────────────────
const HorizResItem = ({ producer, amount, producerLabel, amountLabel, color }) => (
    <div className="horiz-res-item">
        <span className="res-bracket">[</span>
        <div className={`horiz-dot dot-${color}`} />
        <span className="res-separator">|</span>
        <span className="res-text">{producerLabel}: {producer} <span className="res-arrow">→</span> {amountLabel}: {amount}</span>
        <span className="res-bracket">]</span>
    </div>
);

const HorizResourceBar = ({ state, isEnemy, t }) => (
    <div className={`horiz-resource-bar ${isEnemy ? 'enemy-bar' : 'player-bar'}`}>
        <span className="bar-side-label">{isEnemy ? 'ENEMY' : '[PLAYER]'}</span>
        <div className="horiz-res-items">
            <HorizResItem color="red" producer={state.quarries} amount={state.bricks} producerLabel={t.quarries} amountLabel={t.bricks} />
            <HorizResItem color="blue" producer={state.magic} amount={state.gems} producerLabel={t.magic} amountLabel={t.gems} />
            <HorizResItem color="green" producer={state.dungeon} amount={state.beasts} producerLabel={t.dungeon} amountLabel={t.recruits} />
        </div>
    </div>
);

// ── Top Bar Components ───────────────────────────────────────────────────────
const TopBarSide = ({ isEnemy, name, tower, wall }) => (
    <div className={`top-bar-side ${isEnemy ? 'side-left' : 'side-right'}`}>
        {isEnemy && <span className={`side-name enemy-name`}>{name}</span>}
        {isEnemy && <div className="avatar-placeholder enemy-avatar" />}

        <div className={`top-vitals ${isEnemy ? 'vitals-left' : 'vitals-right'}`}>
            <div className="vital-item">
                <span className="vital-icon icon-crown"></span>
                <span className="vital-value" style={{ position: 'relative' }}>{tower}<FloatingNumbers value={tower} /></span>
            </div>
            <div className="vital-item">
                <span className="vital-icon icon-shield"></span>
                <span className="vital-value" style={{ position: 'relative' }}>{wall}<FloatingNumbers value={wall} /></span>
            </div>
        </div>

        {!isEnemy && <div className="avatar-placeholder player-avatar" />}
        {!isEnemy && <span className={`side-name player-name`}>{name}</span>}
    </div>
);

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
    const [language, setLanguage] = useState('zh');
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
            background: '#0d0d0d', overflow: 'hidden',
        }}>
            {isCollectionOpen && (
                <CardCollection onClose={() => setIsCollectionOpen(false)} language={language} t={t} />
            )}

            <Menu
                language={language}
                setLanguage={setLanguage}
                t={t}
                onOpenCollection={() => setIsCollectionOpen(true)}
                onExportDebug={exportDebugLog}
                onNewGame={resetGame}
            />

            <div className="game-board" style={boardStyle}>
                {/* ① TOP BAR */}
                <div className="top-bar">
                    <TopBarSide isEnemy={true} name="ENEMY" tower={enemyState.tower} wall={enemyState.wall} />

                    <div className="top-bar-center">
                        <h1 className="citadel-title-main">{t.gameName}</h1>
                        {winner ? (
                            <div className="winner-msg" onClick={resetGame}>
                                {winner === 'DRAW' ? 'DRAW!' : (winner === 'PLAYER' ? t.playerWins : t.enemyWins)} - {t.playAgain}
                            </div>
                        ) : null}
                    </div>

                    <TopBarSide isEnemy={false} name="PLAYER" tower={playerState.tower} wall={playerState.wall} />
                </div>

                {/* ② BATTLEFIELD */}
                <div className="battlefield">
                    <CastleColumn state={enemyState} isEnemy={true} />

                    <div className="center-action-area">
                        <div className="action-log">
                            {log.map((msg, i) => (
                                <div key={i} className="log-msg mockup-log" style={{ opacity: 1 - i * 0.15 }}>
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

                    <CastleColumn state={playerState} isEnemy={false} />
                </div>

                {/* ③ RESOURCE BARS */}
                <HorizResourceBar state={enemyState} isEnemy={true} t={t} />
                <HorizResourceBar state={playerState} isEnemy={false} t={t} />

                {/* ④ HAND ROW */}
                <div className="mockup-hand-row">
                    <div className="player-hand-flat">
                        {playerHand.map((c, index) => (
                            <div key={c.uid}
                                className={`hand-card-wrapper ${!canAfford(c, playerState) ? 'unaffordable' : ''}`}
                                style={{ zIndex: index }}
                            >
                                <div className="hand-card-inner">
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
