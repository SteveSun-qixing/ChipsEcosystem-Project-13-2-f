import { describe, expect, it } from 'vitest';
import {
  CURRENT_PROTOCOL_VERSION,
  parseRequestMessage,
  parseSerializedRequestMessage,
  serializeRequestMessage,
  parseResponseMessage,
  parseSerializedResponseMessage,
  serializeResponseMessage
} from '../../packages/protocol/src';

describe('Protocol codec', () => {
  it('parses legacy request fields and upgrades action aliases', () => {
    const request = parseRequestMessage({
      version: '0.9.5',
      id: 'req-legacy',
      timestamp: 1700000000000,
      source: 'legacy-plugin',
      serviceName: 'dialog.openFile',
      data: { options: { defaultPath: '/tmp/a.card' } }
    });

    expect(request.protocolVersion).toBe(CURRENT_PROTOCOL_VERSION);
    expect(request.messageId).toBe('req-legacy');
    expect(request.sender).toBe('legacy-plugin');
    expect(request.service).toBe('platform.dialogOpenFile');
    expect(request.payload).toEqual({ options: { defaultPath: '/tmp/a.card' } });
  });

  it('serializes and parses request/response messages', () => {
    const request = {
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      messageId: 'req-1',
      timestamp: new Date().toISOString(),
      sender: 'chips.test',
      service: 'config.get',
      payload: { key: 'ui.locale' }
    };
    const requestRaw = serializeRequestMessage(request);
    const parsedRequest = parseSerializedRequestMessage(requestRaw);
    expect(parsedRequest).toMatchObject(request);

    const response = {
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      messageId: 'resp-1',
      requestId: 'req-1',
      timestamp: new Date().toISOString(),
      status: 'success' as const,
      data: { value: 'zh-CN' }
    };
    const responseRaw = serializeResponseMessage(response);
    const parsedResponse = parseSerializedResponseMessage(responseRaw);
    expect(parsedResponse).toMatchObject(response);
  });

  it('handles compatibility parsing in batch with stable throughput', () => {
    const baseline = {
      version: '1.0',
      id: 'req-batch',
      timestamp: Date.now(),
      source: 'batch-suite',
      serviceName: 'clipboard.write',
      data: { data: 'abc', format: 'text' }
    };

    const started = Date.now();
    for (let index = 0; index < 5000; index += 1) {
      const parsed = parseRequestMessage({ ...baseline, id: `req-${index}` });
      const raw = serializeRequestMessage(parsed);
      parseSerializedRequestMessage(raw);
    }
    const duration = Date.now() - started;

    expect(duration).toBeLessThan(5_000);
  });

  it('rejects malformed protocol version', () => {
    try {
      parseResponseMessage({
        protocolVersion: 'invalid-version',
        messageId: 'resp-1',
        requestId: 'req-1',
        timestamp: new Date().toISOString(),
        status: 'error'
      });
      throw new Error('Expected malformed protocol version to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'PROTOCOL_VERSION_INVALID' });
    }
  });
});
