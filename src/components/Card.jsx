import React from 'react';
import './Card.css';

const Card = ({ card, onPlay, onDiscard, isEnemy, language, t, playerState }) => {
    const handleRightClick = (e) => {
        e.preventDefault();
        if (!isEnemy && onDiscard) onDiscard(card);
    };

    const handleLeftClick = () => {
        if (!isEnemy && onPlay) onPlay(card);
    };

    if (!card) return <div className="card-empty" />;

    if (isEnemy) {
        return <div className="card card-enemy-hidden">Citadel</div>;
    }

    const displayName = language === 'zh' ? card.name_zh || card.name : card.name;
    const displayEffect = language === 'zh' ? card.effect_zh || card.effect : card.effect;
    const cardImageUrl = new URL(`../assets/cards/${card.id}.png`, import.meta.url).href;

    // Determine current resource amount for this card's color
    let currentAmount = null;
    let resourceLabel = '';
    if (playerState) {
        if (card.color === 'Red') { currentAmount = playerState.bricks; resourceLabel = language === 'zh' ? '砖块' : 'Bricks'; }
        if (card.color === 'Blue') { currentAmount = playerState.gems; resourceLabel = language === 'zh' ? '宝石' : 'Gems'; }
        if (card.color === 'Green') { currentAmount = playerState.beasts; resourceLabel = language === 'zh' ? '新兵' : 'Recruits'; }
    }
    const canPlay = currentAmount !== null && currentAmount >= card.cost;

    return (
        <div
            className={`card card-${card.color.toLowerCase()}`}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
        >
            <div className="card-border">
                <div
                    className="card-art"
                    style={{ backgroundImage: `url(${cardImageUrl}), linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))` }}
                >
                    <div className="card-cost">{card.cost}</div>
                </div>
                <div className="card-text-area">
                    <div className="card-name">{displayName}</div>
                    <div className="card-effect">
                        {displayEffect.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
                {/* Footer resource strip */}
                {currentAmount !== null && (
                    <div className={`card-resource-strip color-${card.color.toLowerCase()} ${canPlay ? 'can-afford' : 'cannot-afford'}`}>
                        <span className="resource-strip-label">{resourceLabel}</span>
                        <span className="resource-strip-values">
                            <span className="resource-strip-owned">{currentAmount}</span>
                            <span className="resource-strip-sep">/</span>
                            <span className="resource-strip-cost">{card.cost}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Card;
