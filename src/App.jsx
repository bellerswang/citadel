import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { FloatingNumbers } from './components/FloatingNumbers';
import Card from './components/Card';
import Menu from './components/Menu';
import CardCollection from './components/CardCollection';
import GameGuideOverlay from './components/GameGuideOverlay';
import { useGameState, canAfford } from './useGameState';
import { translations } from './i18n';
import { soundManager } from './soundManager';
import './ActionLog.css';
import './App.css';

// ── Responsive scale ────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 800;
const GAME_VERSION = "v1.0.3";

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
                setTimeout(() => setEffect(null), 2000);
            }
            prevValue.current = value;
        }
    }, [value]);

    return effect;
};

const BattlefieldAvatar = ({ isEnemy, tower, effect }) => {
    let state = 'normal';
    // Expression priorities: Win > Hurt > Normal
    if (tower >= 40) state = 'win';
    if (effect && effect.type === 'loss') state = 'hurt';

    const side = isEnemy ? 'enemy' : 'player';
    const avatarUrl = new URL(`./avatars/${side}_${state}.webp`, import.meta.url).href;

    const effectClass = effect ? `avatar-vfx-${effect.type}-${effect.intensity}` : '';

    return (
        <div className={`battle-avatar-wrapper ${isEnemy ? 'enemy-avatar-pos' : 'player-avatar-pos'}`}>
            <div className={`avatar-frame ${isEnemy ? 'enemy-frame' : 'player-frame'} ${effectClass}`}>
                <img src={avatarUrl} alt="Avatar" className="avatar-img" />
                <div className="avatar-glow" />
            </div>
        </div>
    );
};

// ── Castle Structure Visual (Tower + Wall side-by-side) ─────────────────────
const BattlefieldTarget = ({ children, side, part, animationEvent }) => {
    const target = animationEvent?.target;
    const isTarget = target?.side === side && (target.part === part || target.part === 'field');
    const eventClass = isTarget ? `battlefield-target target-${animationEvent.type} target-${animationEvent.intensity || 'light'}` : 'battlefield-target';

    return (
        <div className={eventClass} data-side={side} data-part={part}>
            {children}
        </div>
    );
};

const CastleColumn = ({ state, isEnemy, t, avatarEffect, animationEvent, isActive }) => {
    // Math.min for visual percentage (cap at 100%)
    const towerPct = Math.min((state.tower / 50) * 100, 100);
    const wallPct = Math.min((state.wall / 50) * 100, 100);

    const towerEffect = useValueChangeEffect(state.tower);
    const wallEffect = useValueChangeEffect(state.wall);

    const towerClass = towerEffect ? `vfx-${towerEffect.type}-${towerEffect.intensity}` : '';
    const wallClass = wallEffect ? `vfx-${wallEffect.type}-${wallEffect.intensity}` : '';

    const towerStateClass = state.tower >= 40 ? 'tower-victory-near' : (state.tower <= 10 ? 'tower-danger' : '');

    const side = isEnemy ? 'enemy' : 'player';

    const towerElement = (
        <div className="structure-container" key="tower">
            <span className="structure-label">{t.tower}</span>
            <BattlefieldTarget side={side} part="tower" animationEvent={animationEvent}>
                <div className={`structure-vfx-wrapper ${towerClass}`} style={{ position: 'relative' }}>
                    <div className="slash-overlay" />
                    <FloatingNumbers value={state.tower} />
                    <div className="fill-bar-container large-bar tower-container">
                        <div className={`fill-bar tower-fill ${towerStateClass}`} style={{ height: `${towerPct}%` }}><div className="bar-cap" /></div>
                        <span className="structure-value">{state.tower}</span>
                    </div>
                </div>
            </BattlefieldTarget>
        </div>
    );

    const wallElement = (
        <div className="structure-container" key="wall">
            <span className="structure-label">{t.wall}</span>
            <BattlefieldTarget side={side} part="wall" animationEvent={animationEvent}>
                <div className={`structure-vfx-wrapper ${wallClass}`} style={{ position: 'relative' }}>
                    <div className="slash-overlay" />
                    <FloatingNumbers value={state.wall} />
                    <div className="fill-bar-container large-bar wall-container">
                        <div className="fill-bar wall-fill" style={{ height: `${wallPct}%` }}><div className="bar-cap" /></div>
                        <span className="structure-value">{state.wall}</span>
                    </div>
                </div>
            </BattlefieldTarget>
        </div>
    );

    return (
        <div className={`castle-column ${isEnemy ? 'enemy-side' : 'player-side'} ${isActive ? 'is-active-side' : ''}`}>
            <BattlefieldAvatar isEnemy={isEnemy} tower={state.tower} effect={avatarEffect} />
            {isEnemy ? [wallElement, towerElement] : [towerElement, wallElement]}
        </div>
    );
};

// ── Vertical Resource Sidebar Components ────────────────────────────────────────────────
const VertResItem = ({ producer, amount, producerLabel, amountLabel, color, resourceKey, error }) => {
    const amountEffect = useValueChangeEffect(amount);
    const producerEffect = useValueChangeEffect(producer);

    // amountClass will scale/flash the whole item
    const wrapClass = amountEffect ? `vfx-res-${amountEffect.type}` : '';
    const prodClass = producerEffect ? `vfx-res-${producerEffect.type}` : '';

    // Determine yield intensity for the +N popup
    const yieldIntensity = producer >= 8 ? 'high' : 'low';
    const colorClass = color === 'red' ? 'green' : (color === 'blue' ? 'blue' : 'red'); // Match icon colors to resource logic

    const errorClass = error?.resource === resourceKey ? 'resource-denied' : '';

    return (
        <div className={`vert-res-item ${wrapClass} ${errorClass}`}>
            {/* POWERFUL POPUP INDICATOR */}
            <div className="resource-popup-container" key={`${amount}-${producer}`}>
                <div className={`resource-popup-val res-popup-${colorClass} res-yield-${yieldIntensity}`}>
                    +{producer}
                </div>
            </div>

            {error?.resource === resourceKey && (
                <div className="resource-error-bubble">Need +{error.missing}</div>
            )}

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

const VertResourceBar = ({ state, isEnemy, t, resourceError }) => (
    <div className={`vert-resource-sidebar ${isEnemy ? 'enemy-sidebar' : 'player-sidebar'}`}>
        <div className="vert-res-items">
            <VertResItem color="red" resourceKey="bricks" error={resourceError} producer={state.quarries} amount={state.bricks} producerLabel={t.quarries} amountLabel={t.bricks} />
            <VertResItem color="blue" resourceKey="gems" error={resourceError} producer={state.magic} amount={state.gems} producerLabel={t.magic} amountLabel={t.gems} />
            <VertResItem color="green" resourceKey="beasts" error={resourceError} producer={state.dungeon} amount={state.beasts} producerLabel={t.dungeon} amountLabel={t.recruits} />
        </div>
    </div>
);

// ── Top Bar Components ───────────────────────────────────────────────────────
// ── Top Bar Components (Dynamic Avatars) ──────────────────────────────────
const TopBarSide = ({ isEnemy, name }) => {
    return (
        <div className={`top-bar-side ${!isEnemy ? 'side-left' : 'side-right'}`}>
            <span className={`side-name ${isEnemy ? 'enemy-name' : 'player-name'}`}>{name}</span>
        </div>
    );
};

// ── Action Log Message ───────────────────────────────────────────────────────

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
        case 'turn_header': return (
            <div className="log-turn-header">
                {language === 'zh' ? `第 ${logObj.turnCount} 回合` : `Turn ${logObj.turnCount}`}
            </div>
        );
        case 'not_enough': return language === 'zh' ? <>资源不足，无法打出 {cardDisplay}!</> : <>Not enough resources for {cardDisplay}!</>;
        case 'played': return <>{actor} {language === 'zh' ? '打出' : 'played'} {cardDisplay}.</>;
        case 'discarded': {
            const action = language === 'zh'
                ? (logObj.isEffect ? '效果弃牌' : '弃牌')
                : (logObj.isEffect ? 'effect discarded' : 'discarded');
            return <>{actor} {action} {cardDisplay}.</>;
        }
        case 'play_again': return `${actor} ${language === 'zh' ? '获得额外回合!' : 'gets to play again!'}`;
        default: return '';
    }
});

// ── Main App ─────────────────────────────────────────────────────────────────
const cardThemeClass = (card) => {
    if (card?.color === 'Red') return 'theme-stone';
    if (card?.color === 'Blue') return 'theme-arcane';
    if (card?.color === 'Green') return 'theme-war';
    return 'theme-neutral';
};

const StageEffectLayer = ({ event }) => {
    if (!event || event.type === 'reset') return null;
    const particles = Array.from({ length: 10 }, (_, index) => index);
    return (
        <div className={`stage-effect-layer ${event.theme ? `theme-${event.theme}` : cardThemeClass(event.card)} event-${event.type}`}>
            <div className="stage-vignette" />
            <div className="stage-sigil" />
            <div className="stage-burst" />
            <div className="stage-particles">
                {particles.map(index => <span key={index} style={{ '--particle-index': index }} />)}
            </div>
        </div>
    );
};

const PresentationStage = ({ activeCard, animationEvent, phase, language }) => {
    const hasCard = Boolean(activeCard);
    const themeClass = animationEvent?.theme ? `theme-${animationEvent.theme}` : cardThemeClass(activeCard);
    const isFaceDown = hasCard && animationEvent?.actor === 'enemy' && animationEvent?.type === 'stage_enter';
    const effectText = activeCard ? (language === 'zh' ? activeCard.effect_zh || activeCard.effect : activeCard.effect) : '';
    const title = activeCard ? (language === 'zh' ? activeCard.name_zh || activeCard.name : activeCard.name) : '';
    const actorLabel = animationEvent?.actor === 'enemy'
        ? (language === 'zh' ? '敌方行动' : 'Enemy Action')
        : (language === 'zh' ? '你的行动' : 'Your Action');

    return (
        <div className={`presentation-stage ${themeClass} phase-${phase} ${hasCard ? 'has-card' : 'is-idle'}`}>
            <StageEffectLayer event={animationEvent} />
            <div className="stage-idle-mark">
                <span>{language === 'zh' ? '战场待命' : 'Battlefield Ready'}</span>
            </div>

            {hasCard && (
                <div className={`active-card-presentation action-${phase} event-${animationEvent?.type || 'idle'}`}>
                    <div className="stage-card-wrap">
                        <Card card={activeCard} showFace={!isFaceDown} isEnemy={isFaceDown} language={language} />
                    </div>
                    <div className="active-card-effect-log">
                        <div className="effect-log-kicker">{actorLabel}</div>
                        <div className="effect-log-title">{title}</div>
                        <div className="effect-log-content">
                            {effectText.split('\n').map((line, idx) => (
                                <div key={idx} className="effect-log-line">{line}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HandFan = ({
    hand,
    focusedCardUid,
    setFocusedCardUid,
    isPlayerTurn,
    isActionPhase,
    playerState,
    activeCard,
    phase,
    lastResourceError,
    playCard,
    discardCard,
    language,
    t
}) => {
    const total = hand.length;
    return (
        <div className={`player-hand-flat hand-fan ${!isPlayerTurn ? 'enemy-turn' : ''}`} style={{ '--hand-count': total }}>
            {hand.map((c, index) => {
                const isFocused = focusedCardUid === c.uid;
                const affordable = canAfford(c, playerState);
                const isRejected = lastResourceError?.cardUid === c.uid;
                const isBeingPlayed = activeCard?.uid === c.uid && (phase === 'playing' || phase === 'discarding');
                const offset = index - (total - 1) / 2;
                const fanStyle = {
                    '--fan-angle': `${offset * 7}deg`,
                    '--fan-y': `${Math.abs(offset) * 5}px`,
                    '--fan-x': `${offset * -5}px`,
                    '--fan-z': index
                };

                return (
                    <div key={c.uid}
                        data-card-uid={c.uid}
                        className={`hand-card-wrapper ${!affordable ? 'unaffordable' : ''} ${isFocused ? 'is-focused' : ''} ${isRejected ? 'is-rejected' : ''} ${isBeingPlayed ? 'is-being-played' : ''}`}
                        style={fanStyle}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isPlayerTurn || isActionPhase) return;
                            soundManager.play('select');
                            setFocusedCardUid(isFocused ? null : c.uid);
                        }}
                    >
                        <div className="hand-card-inner">
                            <Card
                                card={c}
                                isEnemy={false}
                                language={language}
                                t={t}
                                playerState={playerState}
                                onPlay={null}
                                onDiscard={null}
                            />

                            {isFocused && isPlayerTurn && (
                                <div className="card-action-overlay compact-actions" onClick={e => e.stopPropagation()}>
                                    {isRejected && (
                                        <div className="card-reject-hint">
                                            {lastResourceError?.reason === 'locked'
                                                ? (language === 'zh' ? '不能弃牌' : 'Cannot discard')
                                                : (language === 'zh' ? `还差 ${lastResourceError?.missing}` : `Need +${lastResourceError?.missing}`)}
                                        </div>
                                    )}
                                    <button
                                        className="action-menu-btn btn-play"
                                        aria-disabled={!affordable}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playCard(c, true);
                                            setFocusedCardUid(null);
                                        }}
                                    >
                                        {language === 'zh' ? '打出' : 'PLAY'}
                                    </button>
                                    <button
                                        className="action-menu-btn btn-discard"
                                        aria-disabled={c.effect.toLowerCase().includes("can't be discarded without playing it")}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            discardCard(c, true);
                                            setFocusedCardUid(null);
                                        }}
                                    >
                                        {language === 'zh' ? '弃牌' : 'DROP'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function App() {
    const [language, setLanguage] = useState('zh');
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [focusedCardUid, setFocusedCardUid] = useState(null);
    const [hoveredLogCard, setHoveredLogCard] = useState(null);
    const [logCardPos, setLogCardPos] = useState({ x: 0, y: 0 });
    const scale = useViewportScale();
    const t = translations[language];

    const actionLogRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    const [turnBanner, setTurnBanner] = useState(null);
    const isFirstRenderRef = useRef(true);

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
        isPlayerTurn, turnCount, winner, winReason, log, playCard, discardCard,
        resetGame,
        activeCard,
        isActionPhase,
        phase,
        selectedActor,
        animationEvent,
        lastResourceError,
        runAutoplay,
        exportDebugLog
    } = useGameState();

    // Fix: Move all hook calls to top level and avoid short-circuiting logic in JSX
    const playerTowerEff = useValueChangeEffect(playerState.tower);
    const playerWallEff = useValueChangeEffect(playerState.wall);
    const playerCombinedEff = playerTowerEff || playerWallEff;

    const enemyTowerEff = useValueChangeEffect(enemyState.tower);
    const enemyWallEff = useValueChangeEffect(enemyState.wall);
    const enemyCombinedEff = enemyTowerEff || enemyWallEff;

    // Show a turn banner whenever isPlayerTurn changes (skip the very first render)
    useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }
        // BUG FIX: Don't show turn banner if game is over
        if (winner) return;

        const key = Date.now();
        setTurnBanner({ key, isPlayer: isPlayerTurn });
        const bannerTimer = setTimeout(() => setTurnBanner(null), 1700);
        return () => clearTimeout(bannerTimer);
    }, [isPlayerTurn, winner]);

    useEffect(() => {
        if (!animationEvent) return;

        const soundByEvent = {
            card_select: 'select',
            stage_enter: animationEvent.action === 'discard' ? 'discard' : 'play',
            ai_reveal: 'select',
            stage_reveal: 'select',
            effect_release: 'play',
            resource_spend: 'resource_loss',
            resource_error: 'denied',
            discard_denied: 'denied',
            impact: animationEvent.intensity === 'heavy' ? 'damage_heavy' : 'damage_light',
            build: 'resource_gain',
            resource_pull: 'resource_loss',
            card_return: 'discard',
            draw_card: 'resource_gain',
            ai_thinking: 'turn_start',
            play_again: 'turn_start'
        };
        if (soundByEvent[animationEvent.type]) soundManager.play(soundByEvent[animationEvent.type]);

        if (animationEvent.type === 'stage_enter') {
            gsap.fromTo('.active-card-presentation',
                { y: animationEvent.isPlayer ? 120 : -80, scale: 0.72, opacity: 0, rotate: animationEvent.action === 'discard' ? -5 : 2 },
                { y: 0, scale: 1, opacity: 1, rotate: 0, duration: 0.38, ease: 'back.out(1.6)' }
            );
        }

        if (animationEvent.type === 'ai_reveal') {
            gsap.fromTo('.stage-card-wrap',
                { rotateY: 180, scale: 0.95 },
                { rotateY: 0, scale: 1.04, duration: 0.38, ease: 'power2.out', clearProps: 'transform' }
            );
        }

        if (animationEvent.type === 'effect_release') {
            gsap.fromTo('.stage-sigil',
                { scale: 0.65, opacity: 0 },
                { scale: 1.35, opacity: 1, duration: 0.34, ease: 'power2.out' }
            );
        }

        if (['impact', 'build', 'resource_pull'].includes(animationEvent.type)) {
            const sideSelector = animationEvent.target?.side === 'player' ? '.player-side' : '.enemy-side';
            const resourceSelector = animationEvent.target?.side === 'player' ? '.player-sidebar' : '.enemy-sidebar';
            const partSelector = animationEvent.target?.part === 'tower' ? '[data-part="tower"]' : animationEvent.target?.part === 'wall' ? '[data-part="wall"]' : resourceSelector;
            const target = animationEvent.target?.part === 'resource' ? partSelector : `${sideSelector} ${partSelector}`;
            gsap.fromTo(target,
                { x: animationEvent.type === 'impact' ? -6 : 0, y: animationEvent.type === 'build' ? 8 : 0, scale: 1 },
                { x: 0, y: 0, scale: animationEvent.type === 'build' ? 1.05 : 1, duration: 0.44, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' }
            );
        }

        if (animationEvent.type === 'draw_card') {
            gsap.fromTo('.hand-fan .hand-card-wrapper:last-child',
                { y: 36, opacity: 0, scale: 0.86 },
                { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' }
            );
        }

        if (animationEvent.type === 'resource_error' || animationEvent.type === 'discard_denied') {
            const selector = `[data-card-uid="${animationEvent.cardUid}"] .hand-card-inner`;
            gsap.fromTo(selector, { x: -8 }, { x: 0, duration: 0.38, ease: 'elastic.out(1, 0.2)', clearProps: 'transform' });
        }
    }, [animationEvent]);

    useEffect(() => {
        if (!winner) return;
        soundManager.play(winner === 'PLAYER' ? 'victory' : 'defeat');
    }, [winner]);

    const boardStyle = {
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        overflow: 'hidden',
    };

    return (
        <div className={`game-outer-wrapper phase-${phase} actor-${selectedActor}`} onClick={() => setFocusedCardUid(null)}>
            {isCollectionOpen && (
                <CardCollection onClose={() => setIsCollectionOpen(false)} language={language} t={t} />
            )}



            {turnBanner && (
                <div className="turn-banner" key={turnBanner.key}>
                    <div className={`turn-banner-text ${turnBanner.isPlayer ? 'player-color' : 'enemy-color'}`}>
                        {turnBanner.isPlayer
                            ? (language === 'zh' ? '你的回合' : 'YOUR TURN')
                            : (language === 'zh' ? '敌人回合' : 'ENEMY TURN')}
                    </div>
                </div>
            )}

            {winner && (
                <div className="game-over-overlay">
                    <div className="game-over-card">
                        <h2 className={`game-over-title ${winner === 'PLAYER' ? 'win' : 'lose'}`}>
                            {winner === 'PLAYER'
                                ? (language === 'zh' ? '丰碑永存' : 'VICTORY')
                                : (language === 'zh' ? '城门失守' : 'DEFEAT')}
                        </h2>

                        <div className="game-over-stats">
                            <div className="stat-row">
                                <span className="stat-label">{language === 'zh' ? '耗时' : 'Time'}:</span>
                                <span className="stat-value">{turnCount} {language === 'zh' ? '回合' : 'Turns'}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">{language === 'zh' ? '胜利方式' : 'Reason'}:</span>
                                <span className="stat-value">
                                    {winReason === 'tower'
                                        ? (language === 'zh' ? '高塔建成 (50)' : 'Tower Goal Reached (50)')
                                        : (language === 'zh' ? '敌方高塔崩塌 (0)' : 'Enemy Tower Destroyed (0)')}
                                </span>
                            </div>
                        </div>

                        <button className="restart-btn" onClick={resetGame}>
                            {language === 'zh' ? '重整旗鼓' : 'RESTART GAME'}
                        </button>
                    </div>
                </div>
            )}

            <div className="game-board" style={boardStyle}>
                {/* GUIDE OVERLAY (inside board to share scaled coordinate system) */}
                {isGuideOpen && (
                    <GameGuideOverlay
                        onClose={() => setIsGuideOpen(false)}
                        language={language}
                        t={t}
                    />
                )}

                {/* ① TOP BAR */}
                <div className="top-bar">
                    <TopBarSide
                        isEnemy={false}
                        name={t.player}
                    />

                    <div className="header-flex-wrapper">
                        <h1 className="citadel-title-main">
                            {t.gameName}
                            <span style={{ fontSize: '0.4em', color: 'rgba(255, 215, 0, 0.6)', verticalAlign: 'middle', marginLeft: '8px' }}>{GAME_VERSION}</span>
                            <button
                                className="guide-btn"
                                onClick={(e) => { e.stopPropagation(); setIsGuideOpen(true); }}
                                title={language === 'zh' ? '游戏指南' : 'Game Guide'}
                            >?</button>
                        </h1>
                        <div className="top-controls">
                            <div className="settings-toggle" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} title={language === 'zh' ? 'Switch to English' : '切换中文'}>
                                🌐
                            </div>
                        </div>
                    </div>
                    {winner ? (
                        <div className="winner-msg" onClick={resetGame}>
                            {winner === 'DRAW' ? 'DRAW!' : (winner === 'PLAYER' ? t.playerWins : t.enemyWins)} - {t.playAgain}
                        </div>
                    ) : null}

                    <TopBarSide
                        isEnemy={true}
                        name={t.enemy}
                    />
                </div>

                {/* ② BATTLEFIELD */}
                <div className="battlefield">
                    {/* LEFT SIDEBAR: Player Resources */}
                    <div className="battlefield-sidebar">
                        <VertResourceBar state={playerState} isEnemy={false} t={t} resourceError={lastResourceError?.isPlayer ? lastResourceError : null} />
                    </div>

                    <div className="battlefield-center">
                        <CastleColumn
                            state={playerState}
                            isEnemy={false}
                            t={t}
                            avatarEffect={playerCombinedEff}
                            animationEvent={animationEvent}
                            isActive={selectedActor === 'player'}
                        />

                        <div className="center-action-area">
                            <PresentationStage
                                activeCard={activeCard}
                                animationEvent={animationEvent}
                                phase={phase}
                                language={language}
                            />
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
                                <div className={`active-card-presentation action-${phase}`} style={{ visibility: hoveredLogCard ? 'hidden' : 'visible' }}>
                                    <div className="active-card-effect-log">
                                        <div className="effect-log-title">{language === 'zh' ? '卡牌效果' : 'Card Effect'}</div>
                                        <div className="effect-log-content">
                                            {(language === 'zh' ? activeCard.effect_zh : activeCard.effect).split('\n').map((line, idx) => (
                                                <div key={idx} className="effect-log-line">{line}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <Card card={activeCard} showFace={true} isEnemy={!isPlayerTurn} language={language} t={t} />
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

                        <CastleColumn
                            state={enemyState}
                            isEnemy={true}
                            t={t}
                            avatarEffect={enemyCombinedEff}
                            animationEvent={animationEvent}
                            isActive={selectedActor === 'enemy'}
                        />
                    </div>

                    {/* RIGHT SIDEBAR: Enemy Resources */}
                    <div className="battlefield-sidebar">
                        <VertResourceBar state={enemyState} isEnemy={true} t={t} resourceError={lastResourceError?.isPlayer === false ? lastResourceError : null} />
                    </div>
                </div>

                {/* ③ BOTTOM HUD: Card Hand (Centered) */}
                <div className="bottom-hud center-hand">

                    {/* Combat History Log (Bottom Left) */}
                    <div className="combat-history-sidebar">
                        <div className="combat-history-header">{language === 'zh' ? '战斗报告' : 'Combat Log'}</div>
                        <div className="combat-history-scroll">
                            {log.filter(m => m.type === 'played' || m.type === 'discarded').map(m => {
                                const isP = m.isPlayer;
                                const actor = language === 'zh' ? (isP ? '你' : '敌人') : (isP ? 'You' : 'Enemy');
                                const action = m.type === 'played'
                                    ? (language === 'zh' ? '打出了' : 'played')
                                    : (language === 'zh' ? '弃置了' : 'discarded');
                                const cardName = language === 'zh' ? m.card?.name_zh : m.card?.name;
                                const effectText = m.type === 'played' ? (language === 'zh' ? m.card?.effect_zh : m.card?.effect) : '';

                                return (
                                    <div key={m.id} className={`history-entry ${isP ? 'history-player' : 'history-enemy'}`}>
                                        <div className="history-actor">{actor} {action} <b>[{cardName}]</b></div>
                                        {effectText && <div className="history-effect">{effectText}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mockup-hand-row">
                        <HandFan
                            hand={playerHand}
                            focusedCardUid={focusedCardUid}
                            setFocusedCardUid={setFocusedCardUid}
                            isPlayerTurn={isPlayerTurn}
                            isActionPhase={isActionPhase}
                            playerState={playerState}
                            activeCard={activeCard}
                            phase={phase}
                            lastResourceError={lastResourceError}
                            playCard={playCard}
                            discardCard={discardCard}
                            language={language}
                            t={t}
                        />
                        <div className={`player-hand-flat ${!isPlayerTurn ? 'enemy-turn' : ''}`}>
                            {playerHand.map((c, index) => {
                                const isFocused = focusedCardUid === c.uid;
                                const affordable = canAfford(c, playerState);
                                const isRejected = lastResourceError?.cardUid === c.uid;
                                const isBeingPlayed = activeCard?.uid === c.uid && (phase === 'playing' || phase === 'discarding');

                                return (
                                    <div key={c.uid}
                                        data-card-uid={c.uid}
                                        className={`hand-card-wrapper ${!affordable ? 'unaffordable' : ''} ${isFocused ? 'is-focused' : ''} ${isRejected ? 'is-rejected' : ''} ${isBeingPlayed ? 'is-being-played' : ''}`}
                                        style={{ zIndex: index }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isPlayerTurn || isActionPhase) return;
                                            soundManager.play('select');
                                            setFocusedCardUid(isFocused ? null : c.uid);
                                        }}
                                    >
                                        <div className="hand-card-inner">
                                            <Card
                                                card={c}
                                                isEnemy={false}
                                                language={language}
                                                t={t}
                                                playerState={playerState}
                                                // Disable direct clicks since we use the overlay menu
                                                onPlay={null}
                                                onDiscard={null}
                                            />

                                            {isFocused && isPlayerTurn && (
                                                <div className="card-action-overlay" onClick={e => e.stopPropagation()}>
                                                    {isRejected && (
                                                        <div className="card-reject-hint">
                                                            {lastResourceError?.reason === 'locked'
                                                                ? (language === 'zh' ? '这张牌不能弃' : 'Cannot discard')
                                                                : (language === 'zh' ? `还差 ${lastResourceError?.missing}` : `Need +${lastResourceError?.missing}`)}
                                                        </div>
                                                    )}
                                                    <button
                                                        className="action-menu-btn btn-play"
                                                        aria-disabled={!affordable}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            playCard(c, true);
                                                            setFocusedCardUid(null);
                                                        }}
                                                    >
                                                        {language === 'zh' ? '打出' : 'Play'}
                                                    </button>
                                                    <button
                                                        className="action-menu-btn btn-discard"
                                                        aria-disabled={c.effect.toLowerCase().includes("can't be discarded without playing it")}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            discardCard(c, true);
                                                            setFocusedCardUid(null);
                                                        }}
                                                    >
                                                        {language === 'zh' ? '弃牌' : 'Discard'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
