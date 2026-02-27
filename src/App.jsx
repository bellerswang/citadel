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
            <div className={`fill-bar-container large-bar tower-container ${towerClass}`}>
                <div className="slash-overlay" />
                <div className="fill-bar tower-fill" style={{ height: `${towerPct}%` }}><div className="bar-cap" /></div>
                <span className="structure-value" style={{ position: 'relative' }}>{state.tower}<FloatingNumbers value={state.tower} /></span>
            </div>
        </div>
    );

    const wallElement = (
        <div className="structure-container" key="wall">
            <span className="structure-label">{t.wall}</span>
            <div className={`fill-bar-container large-bar wall-container ${wallClass}`}>
                <div className="slash-overlay" />
                <div className="fill-bar wall-fill" style={{ height: `${wallPct}%` }}><div className="bar-cap" /></div>
                <span className="structure-value" style={{ position: 'relative' }}>{state.wall}<FloatingNumbers value={state.wall} /></span>
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

// ── Horizontal Resource Bar Components ──────────────────────────────────────────────────
const HorizResItem = ({ producer, amount, producerLabel, amountLabel, color }) => {
    const amountEffect = useValueChangeEffect(amount);
    const producerEffect = useValueChangeEffect(producer);

    // amountClass will scale/flash the whole item
    const wrapClass = amountEffect ? `vfx-res-${amountEffect.type}` : '';
    const prodClass = producerEffect ? `vfx-res-${producerEffect.type}` : '';

    return (
        <div className={`horiz-res-item ${wrapClass}`}>
            <span className="res-bracket">[</span>
            <div className={`horiz-dot dot-${color} ${prodClass}`} />
            <span className="res-separator">|</span>
            <span className="res-text">
                <span className={prodClass}>{producerLabel}: {producer}</span> <span className="res-arrow">→</span> <span className={wrapClass}>{amountLabel}: {amount}</span>
            </span>
            <span className="res-bracket">]</span>
        </div>
    );
};

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
const TopBarSide = ({ isEnemy, name }) => (
    <div className={`top-bar-side ${!isEnemy ? 'side-left' : 'side-right'}`}>
        {!isEnemy ? (
            <>
                <div className="avatar-placeholder player-avatar" />
                <span className={`side-name player-name`}>{name}</span>
            </>
        ) : (
            <>
                <span className={`side-name enemy-name`}>{name}</span>
                <div className="avatar-placeholder enemy-avatar" />
            </>
        )}
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
                    <TopBarSide isEnemy={false} name="PLAYER" />

                    <div className="top-bar-center">
                        <h1 className="citadel-title-main">{t.gameName}</h1>
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
                    <CastleColumn state={playerState} isEnemy={false} t={t} />

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

                    <CastleColumn state={enemyState} isEnemy={true} t={t} />
                </div>

                {/* ③ RESOURCE BARS */}
                <HorizResourceBar state={playerState} isEnemy={false} t={t} />
                <HorizResourceBar state={enemyState} isEnemy={true} t={t} />

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
