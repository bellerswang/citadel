import React from 'react';
import './ResourcePanel.css';
import { FloatingNumbers } from './FloatingNumbers';

const ResourceItem = ({ name, label, producer, amount, color }) => (
    <div className={`resource-item color-${color}`}>
        <div className="resource-icon-container">
            <div className={`resource-dot dot-${color}`}></div>
        </div>
        <div className="producer-box">
            <span className="producer-val" style={{ position: 'relative' }}>
                {producer}
                <FloatingNumbers value={producer} />
            </span>
            <span className="producer-lbl">{label.split('/')[0]}</span>
        </div>
        <div className="amount-box">
            <span className="amount-val" style={{ position: 'relative' }}>
                {amount}
                <FloatingNumbers value={amount} />
            </span>
            <span className="amount-lbl">{label.split('/')[1]}</span>
        </div>
    </div>
);

const ResourcePanel = ({ state, isEnemy, t }) => {
    return (
        <div className={`resource-panel ${isEnemy ? 'enemy' : 'player'}`}>
            <h2 className="panel-title">{isEnemy ? t.enemy : t.player}</h2>

            <div className="resources-container">
                <ResourceItem
                    name="Quarries/Bricks"
                    label={`${t.quarries}/${t.bricks}`}
                    producer={state.quarries}
                    amount={state.bricks}
                    color="red"
                />
                <ResourceItem
                    name="Magic/Gems"
                    label={`${t.magic}/${t.gems}`}
                    producer={state.magic}
                    amount={state.gems}
                    color="blue"
                />
                <ResourceItem
                    name="Dungeon/Recruits"
                    label={`${t.dungeon}/${t.recruits}`}
                    producer={state.dungeon}
                    amount={state.beasts}
                    color="green"
                />
            </div>
        </div>
    );
};

export default ResourcePanel;
