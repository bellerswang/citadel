import React, { useState, useEffect, useRef } from 'react';

export const FloatingNumbers = ({ value }) => {
    const [changes, setChanges] = useState([]);
    const prevValue = useRef(value);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            prevValue.current = value;
            return;
        }
        if (value !== prevValue.current) {
            const diff = value - prevValue.current;
            if (diff !== 0) {
                const id = Date.now() + Math.random();
                setChanges(c => [...c, { id, diff }]);
                setTimeout(() => setChanges(c => c.filter(x => x.id !== id)), 1500);
            }
            prevValue.current = value;
        }
    }, [value]);

    return (
        <>
            {changes.map(c => {
                const mag = Math.abs(c.diff);
                const intensity = mag >= 10 ? 'heavy' : (mag >= 4 ? 'medium' : 'light');
                return (
                    <span key={c.id} className={`floating-number ${c.diff > 0 ? 'positive' : 'negative'} intensity-${intensity}`}>
                        {c.diff > 0 ? `+${c.diff}` : c.diff}
                    </span>
                );
            })}
        </>
    );
};
