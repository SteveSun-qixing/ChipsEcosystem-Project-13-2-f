export function createRuntimeEventSource(client) {
    return {
        subscribe(eventName, handler) {
            return client.events.on(eventName, handler);
        },
    };
}
