import React, { useState, useEffect, useRef, useCallback } from 'react';
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
const DESIGN_HEIGHT = 800;

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

// ── VFX Custom Hook ─────────────────────────────────────────────────────────
const useValueChangeEffect = (value) => {
    const [effect, setEffect] = useState(null);
    const prevValue = useRef(value);
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current) { isFirst.current = false; prevValue.current = value; return; }
        if (value !== prevValue.current) {
            const diff = value - prevValue.current;
            if (diff !== 0) {
                const magnitude = Math.abs(diff);
                const intensity = magnitude >= 10 ? 'heavy' : (magnitude >= 4 ? 'medium' : 'light');
                const type = diff > 0 ? 'gain' : 'loss';
                setEffect({ type, intensity, diff, id: Date.now() });
                setTimeout(() => setEffect(null), 1000);
            }
            prevValue.current = value;
        }
    }, [value]);

    return effect;
};

// ── Castle Structure Visual (Tower + Wall side-by-side) ─────────────────────
// Redesign to side-by-side: Wall in front of Tower (closer to center).
const CastleColumn = ({ state, isEnemy, t }) => {
    // Math.min for visual percentage (cap at 100%)
    const towerPct = Math.min((state.tower / 50) * 100, 100);
    const wallPct = Math.min((state.wall / 50) * 100, 100);

    const towerEffect = useValueChangeEffect(state.tower);
    const wallEffect = useValueChangeEffect(state.wall);

    const towerClass = towerEffect ? `vfx-${towerEffect.type}-${towerEffect.intensity}` : '';
    const wallClass = wallEffect ? `vfx-${wallEffect.type}-${wallEffect.intensity}` : '';

    const towerElement = (
        <div className="structure-container" key="tower">
            <span className="structure-label">{t.tower}</span>
            <div className={`structure-vfx-wrapper ${towerClass}`} style={{ position: 'relative' }}>
                <div className="slash-overlay" />
                <FloatingNumbers value={state.tower} />
                <div className="fill-bar-container large-bar tower-container">
                    <div className="fill-bar tower-fill" style={{ height: `${towerPct}%` }}><div className="bar-cap" /></div>
                    <span className="structure-value">{state.tower}</span>
                </div>
            </div>
        </div>
    );

    const wallElement = (
        <div className="structure-container" key="wall">
            <span className="structure-label">{t.wall}</span>
            <div className={`structure-vfx-wrapper ${wallClass}`} style={{ position: 'relative' }}>
                <div className="slash-overlay" />
                <FloatingNumbers value={state.wall} />
                <div className="fill-bar-container large-bar wall-container">
                    <div className="fill-bar wall-fill" style={{ height: `${wallPct}%` }}><div className="bar-cap" /></div>
                    <span className="structure-value">{state.wall}</span>
                </div>
            </div>
        </div>
    );

    // Wall conceptually "in front" of the Tower relative to the battlefield center.
    // For Player (now Left side), Wall is on the right of the Tower. -> [towerElement, wallElement]
    // For Enemy (now Right side), Wall is on the left of the Tower. -> [wallElement, towerElement]
    return (
        <div className={`castle-column ${isEnemy ? 'enemy-side' : 'player-side'}`}>
            {isEnemy ? [wallElement, towerElement] : [towerElement, wallElement]}
        </div>
    );
};

// ── Vertical Resource Sidebar Components ────────────────────────────────────────────────
const VertResItem = ({ producer, amount, producerLabel, amountLabel, color }) => {
    const amountEffect = useValueChangeEffect(amount);
    const producerEffect = useValueChangeEffect(producer);

    // amountClass will scale/flash the whole item
    const wrapClass = amountEffect ? `vfx-res-${amountEffect.type}` : '';
    const prodClass = producerEffect ? `vfx-res-${producerEffect.type}` : '';

    return (
        <div className={`vert-res-item ${wrapClass}`}>
            <div className={`vert-res-icon-ring ring-${color}`}>
                <div className={`vert-dot dot-${color} ${prodClass}`} />
                <div className="vert-res-amount">{amount}</div>
            </div>
            <div className="vert-res-prod-box">
                <span className={`vert-res-prod-val ${prodClass}`}>+{producer}</span>
                <span className="vert-res-prod-label">{producerLabel}</span>
            </div>
        </div>
    );
};

const VertResourceBar = ({ state, isEnemy, t }) => (
    <div className={`vert-resource-sidebar ${isEnemy ? 'enemy-sidebar' : 'player-sidebar'}`}>
        <div className="vert-res-items">
            <VertResItem color="red" producer={state.quarries} amount={state.bricks} producerLabel={t.quarries} amountLabel={t.bricks} />
            <VertResItem color="blue" producer={state.magic} amount={state.gems} producerLabel={t.magic} amountLabel={t.gems} />
            <VertResItem color="green" producer={state.dungeon} amount={state.beasts} producerLabel={t.dungeon} amountLabel={t.recruits} />
        </div>
    </div>
);

// ── Top Bar Components ───────────────────────────────────────────────────────
const TopBarSide = ({ isEnemy, name }) => (
    <div className={`top-bar-side ${!isEnemy ? 'side-left' : 'side-right'}`}>
        {!isEnemy ? (
            <>
                <span className={`side-name player-name`}>{name}</span>
                <div className="avatar-placeholder player-avatar" />
            </>
        ) : (
            <>
                <div className="avatar-placeholder enemy-avatar" />
                <span className={`side-name enemy-name`}>{name}</span>
            </>
        )}
    </div>
);

// ── Action Log Message ───────────────────────────────────────────────────────
const LogMessage = React.memo(({ logObj, language, t }) => {
    if (!logObj || typeof logObj === 'string') return logObj;
    const actor = logObj.isPlayer ? t.player : t.enemy;
    const cName = logObj.card ? (language === 'zh' ? logObj.card.name_zh : logObj.card.name) : '';

    const cardDisplay = logObj.card ? (
        <span className={`log-card-icon icon-color-${logObj.card.color.toLowerCase()}`}>
            {cName}
        </span>
    ) : null;

    switch (logObj.type) {
        case 'start': return language === 'zh' ? '游戏开始！' : 'Game Started!';
        case 'not_enough': return language === 'zh' ? <>资源不足，无法打出 {cardDisplay}!</> : <>Not enough resources for {cardDisplay}!</>;
        case 'played': return <>{actor} {language === 'zh' ? '打出' : 'played'} {cardDisplay}.</>;
        case 'discarded': return <>{actor} {language === 'zh' ? '弃牌' : 'discarded'} {cardDisplay}.</>;
        case 'play_again': return `${actor} ${language === 'zh' ? '获得额外回合!' : 'gets to play again!'}`;
        default: return '';
    }
});

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
    const [language, setLanguage] = useState('zh');
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [hoveredLogCard, setHoveredLogCard] = useState(null);
    const [logCardPos, setLogCardPos] = useState({ x: 0, y: 0 });
    const scale = useViewportScale();
    const t = translations[language];

    const actionLogRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    const handleLogScroll = useCallback(() => {
        if (actionLogRef.current) {
            actionLogRef.current.classList.add('is-scrolling');
        }
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            if (actionLogRef.current) {
                actionLogRef.current.classList.remove('is-scrolling');
            }
        }, 2000);
    }, []);

    const {
        playerState, enemyState, playerHand, enemyHand,
        isPlayerTurn, turnCount, winner, log, playCard, discardCard,
        resetGame,
        activeCard,
        isActionPhase,
        runAutoplay,
        exportDebugLog
    } = useGameState();



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

            <div className="game-board" style={boardStyle}>
                {/* ① TOP BAR */}
                <div className="top-bar">
                    <TopBarSide isEnemy={false} name="PLAYER" />

                    <div className="top-bar-center">
                        <h1 className="citadel-title-main">
                            {t.gameName}
                        </h1>
                        <div className="turn-counter">
                            {language === 'zh' ? `第 ${turnCount} 回合` : `Turn ${turnCount}`}
                        </div>
                        <div className="top-controls">
                            <div className="settings-toggle" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} title={language === 'zh' ? 'Switch to English' : '切换中文'}>
                                🌐
                            </div>
                        </div>
                        {winner ? (
                            <div className="winner-msg" onClick={resetGame}>
                                {winner === 'DRAW' ? 'DRAW!' : (winner === 'PLAYER' ? t.playerWins : t.enemyWins)} - {t.playAgain}
                            </div>
                        ) : null}
                    </div>

                    <TopBarSide isEnemy={true} name="ENEMY" />
                </div>

                {/* ② BATTLEFIELD */}
                <div className="battlefield">
                    {/* LEFT SIDEBAR: Player Resources */}
                    <div className="battlefield-sidebar">
                        <VertResourceBar state={playerState} isEnemy={false} t={t} />
                    </div>

                    <div className="battlefield-center">
                        <CastleColumn state={playerState} isEnemy={false} t={t} />

                        <div className="center-action-area">
                            <div className="action-log" ref={actionLogRef} onScroll={handleLogScroll}>
                                {log.map((msg, i) => (
                                    <div
                                        key={msg.id || i}
                                        className={`log-msg mockup-log ${msg.card ? 'interactive-log' : ''}`}
                                        style={{
                                            '--base-opacity': Math.max(0, 1 - i * 0.15),
                                            cursor: msg.card ? 'pointer' : 'default',
                                            WebkitTapHighlightColor: 'transparent'
                                        }}
                                        onPointerEnter={() => {
                                            if (msg.card) setHoveredLogCard({ card: msg.card, isPlayer: msg.isPlayer });
                                        }}
                                        onPointerLeave={() => {
                                            if (msg.card) setHoveredLogCard(null);
                                        }}
                                        onClick={() => {
                                            if (msg.card) {
                                                setHoveredLogCard(prev =>
                                                    prev?.card?.id === msg.card?.id ? null : { card: msg.card, isPlayer: msg.isPlayer }
                                                );
                                            }
                                        }}
                                    >
                                        <LogMessage logObj={msg} language={language} t={t} />
                                    </div>
                                ))}
                            </div>
                            {activeCard && (
                                <div className="active-card-presentation" style={{ visibility: hoveredLogCard ? 'hidden' : 'visible' }}>
                                    <Card card={activeCard} showFace={true} isEnemy={false} language={language} t={t} />
                                </div>
                            )}
                        </div>

                        {/* Log-hover card preview — rendered as overlay, pointer-events:none so it
                        never intercepts the cursor and causes a hover-loop flicker */}
                        {hoveredLogCard && (
                            <div
                                className="log-hover-card-overlay"
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '40%',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                    zIndex: 500,
                                }}
                            >
                                {/* showFace=true ensures enemy cards show their face instead of the hidden back.
                                The inner div disables CSS :hover on the Card so the scale animation
                                never triggers and causes a flicker loop. */}
                                <div style={{ pointerEvents: 'none' }}>
                                    <Card card={hoveredLogCard.card} showFace={true} isEnemy={false} language={language} t={t} />
                                </div>
                            </div>
                        )}

                        <CastleColumn state={enemyState} isEnemy={true} t={t} />
                    </div>

                    {/* RIGHT SIDEBAR: Enemy Resources */}
                    <div className="battlefield-sidebar">
                        <VertResourceBar state={enemyState} isEnemy={true} t={t} />
                    </div>
                </div>

                {/* ③ BOTTOM HUD: Card Hand (Centered) */}
                <div className="bottom-hud center-hand">
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

                    <div className="bottom-hud-menu-wrapper">
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
            </div>
        </div>
    );
}

export default App;
