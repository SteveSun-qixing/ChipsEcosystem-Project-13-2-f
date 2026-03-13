import { createClient, type Client } from 'chips-sdk';

let _client: Client | null = null;

/**
 * 获取 SDK 客户端单例
 * 在应用插件环境，它会自动适配 Bridge API。
 */
export function getChipsClient(): Client {
    if (!_client) {
        _client = createClient();
    }
    return _client;
}
