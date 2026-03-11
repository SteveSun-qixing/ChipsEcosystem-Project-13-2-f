import React from "react";
import { useRuntimeContext } from "../../app/providers/RuntimeProvider";

export function useHostRefresh(eventNames: string[], refresh: () => Promise<void>): void {
  const { client } = useRuntimeContext();
  const eventKey = React.useMemo(() => eventNames.join("|"), [eventNames]);
  const stableEventNames = React.useMemo(() => [...eventNames], [eventKey]);
  const refreshRef = React.useRef(refresh);

  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  React.useEffect(() => {
    const unsubscribers = stableEventNames.map((eventName) => {
      return client.events.on(eventName, () => {
        void refreshRef.current();
      });
    });

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [client, stableEventNames]);
}
