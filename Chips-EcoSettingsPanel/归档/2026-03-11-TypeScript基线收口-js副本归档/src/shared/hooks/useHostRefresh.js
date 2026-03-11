import React from "react";
import { useRuntimeContext } from "../../app/providers/RuntimeProvider";
export function useHostRefresh(eventNames, refresh) {
    const { client } = useRuntimeContext();
    React.useEffect(() => {
        const unsubscribers = eventNames.map((eventName) => {
            return client.events.on(eventName, () => {
                void refresh();
            });
        });
        return () => {
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
        };
    }, [client, eventNames, refresh]);
}
