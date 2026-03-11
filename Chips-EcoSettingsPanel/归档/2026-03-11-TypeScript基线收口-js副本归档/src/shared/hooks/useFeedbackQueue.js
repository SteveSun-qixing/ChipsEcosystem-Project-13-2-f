import React from "react";
export function useFeedbackQueue() {
    const [items, setItems] = React.useState([]);
    const push = React.useCallback((item) => {
        setItems((current) => [
            ...current,
            {
                ...item,
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            },
        ]);
    }, []);
    const clear = React.useCallback(() => {
        setItems([]);
    }, []);
    return {
        items,
        push,
        clear,
    };
}
