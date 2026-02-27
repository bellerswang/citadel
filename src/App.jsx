import React, { useState, useEffect } from 'react';
import ResourcePanel from './components/ResourcePanel';
import { FloatingNumbers } from './components/FloatingNumbers';
import Card from './components/Card';
import Menu from './components/Menu';
import CardCollection from './components/CardCollection';
import { useGameState, canAfford } from './useGameState';
import { translations } from './i18n';
import './ActionLog.css';
import './App.css';

const Structure = ({ type, height, label }) => {
    const maxHeight = 50;
    const percentage = Math.min((height / maxHeight) * 100, 100);

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
                    <div
                        className={`structure-bar ${type}-bar`}
                        style={{ height: `${percentage}%` }}
                    >
                        <div className="bar-cap"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [language, setLanguage] = useState('en');
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const t = translations[language];
    const {
        playerState,
        enemyState,
        playerHand,
        enemyHand,
        isPlayerTurn,
        winner,
        log,
        playCard,
        discardCard,
        resetGame,
        activeCard,
        isActionPhase,
        exportDebugLog
    } = useGameState();

    const formatLog = (logObj) => {
        if (!logObj || typeof logObj === 'string') return logObj;
        const actor = logObj.isPlayer ? t.player : t.enemy;
        const cName = logObj.card ? (language === 'zh' ? logObj.card.name_zh : logObj.card.name) : '';

        switch (logObj.type) {
            case 'start': return language === 'zh' ? "游戏开始！" : "Game Started!";
            case 'not_enough': return language === 'zh' ? `资源不足，无法打出 ${cName}!` : `Not enough resources for ${cName}!`;
            case 'played': return `${actor} ${language === 'zh' ? '打出' : 'played'} ${cName}.`;
            case 'discarded': return `${actor} ${language === 'zh' ? '弃牌' : 'discarded'} ${cName}.`;
            case 'play_again': return `${actor} ${language === 'zh' ? '获得额外回合!' : 'gets to play again!'}`;
            default: return "";
        }
    };

    return (
        <div className="game-board">
            <Menu
                language={language}
                setLanguage={setLanguage}
                t={t}
                onOpenCollection={() => setIsCollectionOpen(true)}
                onExportDebug={exportDebugLog}
            />
            {isCollectionOpen && (
                <CardCollection
                    onClose={() => setIsCollectionOpen(false)}
                    language={language}
                    t={t}
                />
            )}

            <div className="dashboard-container">
                <ResourcePanel state={playerState} isEnemy={false} t={t} />

                <div className="game-status">
                    <h1 className="citadel-title">{t.gameName}</h1>
                    {winner ? <h1>{winner === 'DRAW' ? (language === 'zh' ? '平局！' : 'DRAW!') : (winner === 'PLAYER' ? t.playerWins : t.enemyWins)}</h1> : <h2>{isPlayerTurn ? t.yourTurn : t.enemyTurn}</h2>}
                    {winner && <button className="btn-reset" onClick={resetGame}>{t.playAgain}</button>}
                </div>

                <ResourcePanel state={enemyState} isEnemy={true} t={t} />
            </div>

            <div className="battlefield">
                <div className="tower-area player-tower-area">
                    <Structure type="tower" height={playerState.tower} label={t.tower} />
                    <Structure type="wall" height={playerState.wall} label={t.wall} />
                </div>

                <div className="center-action-area">
                    <div className="action-log">
                        {log.map((msg, i) => (
                            <div key={i} className="log-msg" style={{ opacity: 1 - (i * 0.15) }}>{formatLog(msg)}</div>
                        ))}
                    </div>
                    {/* Active card presentation */}
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

            <div className="bottom-section">
                <div className="discard-hint">
                    {language === 'zh' ? '💡 提示：右键点击卡牌可以将其丢弃 (跳过回合)' : '💡 Hint: Right-Click a card to discard it (skip turn)'}
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
        </div>
    );
}

export default App;
