import React, { useState } from 'react';
import './Menu.css';

const Menu = ({ language, setLanguage, t, onOpenCollection, onExportDebug, onNewGame }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`menu-container ${isOpen ? 'open' : ''}`}>
            {isOpen && (
                <div className="menu-items">
                    <button
                        className="menu-btn menu-btn-new-game"
                        onClick={() => {
                            setIsOpen(false);
                            onNewGame();
                        }}
                    >
                        🔄 {language === 'zh' ? '新游戏' : 'New Game'}
                    </button>
                    <button
                        className="menu-btn"
                        onClick={() => {
                            setLanguage(language === 'en' ? 'zh' : 'en');
                        }}
                    >
                        🌐 {language === 'en' ? '中文' : 'ENG'}
                    </button>
                    <button
                        className="menu-btn"
                        onClick={() => {
                            setIsOpen(false);
                            onOpenCollection();
                        }}
                    >
                        📚 {t.cardCollection}
                    </button>
                    <button
                        className="menu-btn"
                        onClick={() => {
                            setIsOpen(false);
                            onExportDebug();
                        }}
                    >
                        🐛 Bug Report
                    </button>
                </div>
            )}
            <button
                className="menu-toggle-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                ⚙️ {t.menu}
            </button>
        </div>
    );
};

export default Menu;
