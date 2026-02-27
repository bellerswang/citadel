import React, { useState } from 'react';
import './Menu.css';

const Menu = ({ language, setLanguage, t, onOpenCollection, onExportDebug, onNewGame }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);

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
                    <button
                        className="menu-btn menu-btn-how-to-play"
                        onClick={() => {
                            setIsOpen(false);
                            setShowHowToPlay(true);
                        }}
                    >
                        📖 {t.howToPlay}
                    </button>
                </div>
            )}
            <button
                className="menu-toggle-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                ⚙️ {t.menu}
            </button>

            {/* How To Play Modal */}
            {showHowToPlay && (
                <div className="htp-overlay" onClick={() => setShowHowToPlay(false)}>
                    <div className="htp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="htp-header">
                            <h2>📖 {t.howToPlay}</h2>
                            <button className="close-btn" onClick={() => setShowHowToPlay(false)}>✖ {t.close}</button>
                        </div>
                        <div className="htp-content">
                            <section>
                                <h3>{t.htpGoalTitle}</h3>
                                <p>{t.htpGoalText}</p>
                            </section>

                            <section>
                                <h3>{t.htpResourcesTitle}</h3>
                                <ul>
                                    <li><span className="htp-dot dot-red"></span> {t.htpResourcesText1}</li>
                                    <li><span className="htp-dot dot-blue"></span> {t.htpResourcesText2}</li>
                                    <li><span className="htp-dot dot-green"></span> {t.htpResourcesText3}</li>
                                </ul>
                                <p>{t.htpResourcesText4}</p>
                            </section>

                            <section>
                                <h3>{t.htpActionsTitle}</h3>
                                <ul>
                                    <li>{t.htpActionsText1}</li>
                                    <li>{t.htpActionsText2}</li>
                                </ul>
                                <p>{t.htpActionsText3}</p>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;
