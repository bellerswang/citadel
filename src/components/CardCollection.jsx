import React, { useState } from 'react';
import Card from './Card';
import cardsData from '../cards.json';
import './CardCollection.css';

const CardCollection = ({ onClose, language, t }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [colorFilter, setColorFilter] = useState('All');
    const [focusedCard, setFocusedCard] = useState(null);

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    // Filter logic
    const filteredCards = cardsData.filter(card => {
        // Color filter
        if (colorFilter !== 'All' && card.color !== colorFilter) return false;

        // Search filter (check both eng and chinese names)
        if (searchTerm.trim() !== '') {
            const query = searchTerm.toLowerCase();
            const nameMatch = card.name.toLowerCase().includes(query);
            const zhMatch = card.name_zh && card.name_zh.includes(query);
            if (!nameMatch && !zhMatch) return false;
        }

        return true;
    });

    return (
        <div className="collection-overlay">
            <div className="collection-modal">
                <div className="collection-header">
                    <h2>📚 {t.cardCollection} ({filteredCards.length})</h2>
                    <button className="close-btn" onClick={onClose}>✖ {t.close}</button>
                </div>

                <div className="collection-controls">
                    <input
                        type="text"
                        placeholder={t.search}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                    />

                    <div className="color-filters">
                        <button
                            className={`filter-btn ${colorFilter === 'All' ? 'active' : ''}`}
                            onClick={() => setColorFilter('All')}
                        >
                            {t.allColors}
                        </button>
                        <button
                            className={`filter-btn filter-red ${colorFilter === 'Red' ? 'active' : ''}`}
                            onClick={() => setColorFilter('Red')}
                        >
                            {t.colorRed}
                        </button>
                        <button
                            className={`filter-btn filter-blue ${colorFilter === 'Blue' ? 'active' : ''}`}
                            onClick={() => setColorFilter('Blue')}
                        >
                            {t.colorBlue}
                        </button>
                        <button
                            className={`filter-btn filter-green ${colorFilter === 'Green' ? 'active' : ''}`}
                            onClick={() => setColorFilter('Green')}
                        >
                            {t.colorGreen}
                        </button>
                    </div>
                </div>

                <div className="collection-grid">
                    {filteredCards.map(card => (
                        <div
                            key={card.id}
                            className="grid-card-wrapper"
                            onClick={() => setFocusedCard(card)}
                        >
                            <Card card={card} isEnemy={false} language={language} t={t} />
                        </div>
                    ))}
                    {filteredCards.length === 0 && (
                        <div className="no-results">No cards found.</div>
                    )}
                </div>
            </div>

            {/* Focused Card Backdrop */}
            {focusedCard && (
                <div className="focused-card-backdrop" onClick={() => setFocusedCard(null)}>
                    <div className="focused-card-container" onClick={(e) => e.stopPropagation()}>
                        <Card card={focusedCard} isEnemy={false} language={language} t={t} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardCollection;
