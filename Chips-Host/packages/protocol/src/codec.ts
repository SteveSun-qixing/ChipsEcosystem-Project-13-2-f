import { createError } from '../../../src/shared/errors';
import type { ChipsEventMessage, ChipsRequestMessage, ChipsResponseMessage } from './messages';

export const CURRENT_PROTOCOL_VERSION = '1.0.0';

const LEGACY_ACTION_ALIASES: Record<string, string> = {
  'dialog.openFile': 'platform.dialogOpenFile',
  'dialog.saveFile': 'platform.dialogSaveFile',
  'dialog.showMessage': 'platform.dialogShowMessage',
  'dialog.showConfirm': 'platform.dialogShowConfirm',
  'clipboard.read': 'platform.clipboardRead',
  'clipboard.write': 'platform.clipboardWrite',
  'shell.openPath': 'platform.shellOpenPath',
  'shell.openExternal': 'platform.shellOpenExternal',
  'shell.showItemInFolder': 'platform.shellShowItemInFolder'
};

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    throw createError('PROTOCOL_INVALID_MESSAGE', `${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const normalizeVersion = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return CURRENT_PROTOCOL_VERSION;
  }

  const trimmed = value.trim();
  if (/^1(\.0(\.0)?)?$/.test(trimmed)) {
    return CURRENT_PROTOCOL_VERSION;
  }

  if (/^0\./.test(trimmed)) {
    return CURRENT_PROTOCOL_VERSION;
  }

  if (!/^\d+\.\d+\.\d+$/.test(trimmed)) {
    throw createError('PROTOCOL_VERSION_INVALID', `Invalid protocol version: ${trimmed}`);
  }

  return trimmed;
};

const normalizeTimestamp = (value: unknown): string => {
  if (typeof value === 'string' && value.length > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString();
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
};

const normalizeAction = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createError('PROTOCOL_ACTION_INVALID', 'service/action is required');
  }
  const action = value.trim();
  return LEGACY_ACTION_ALIASES[action] ?? action;
};

export const parseRequestMessage = (value: unknown): ChipsRequestMessage => {
  const record = asRecord(value, 'Request message');
  const messageId = record.messageId ?? record.id;
  if (typeof messageId !== 'string' || messageId.trim().length === 0) {
    throw createError('PROTOCOL_MESSAGE_ID_REQUIRED', 'Request messageId is required');
  }

  return {
    protocolVersion: normalizeVersion(record.protocolVersion ?? record.version),
    messageId: messageId.trim(),
    timestamp: normalizeTimestamp(record.timestamp),
    sender: typeof record.sender === 'string' ? record.sender : typeof record.source === 'string' ? record.source : 'unknown',
    service: normalizeAction(record.service ?? record.serviceName ?? record.action),
    payload: record.payload ?? record.data ?? {},
    options:
      record.options && typeof record.options === 'object'
        ? (record.options as ChipsRequestMessage['options'])
        : undefined
  };
};

export const parseResponseMessage = (value: unknown): ChipsResponseMessage => {
  const record = asRecord(value, 'Response message');
  const messageId = record.messageId ?? record.id;
  const requestId = record.requestId ?? record.correlationId;

  if (typeof messageId !== 'string' || messageId.trim().length === 0) {
    throw createError('PROTOCOL_MESSAGE_ID_REQUIRED', 'Response messageId is required');
  }
  if (typeof requestId !== 'string' || requestId.trim().length === 0) {
    throw createError('PROTOCOL_REQUEST_ID_REQUIRED', 'Response requestId is required');
  }

  const status =
    record.status === 'success' || record.status === 'error' || record.status === 'partial'
      ? record.status
      : 'success';

  return {
    protocolVersion: normalizeVersion(record.protocolVersion ?? record.version),
    messageId: messageId.trim(),
    requestId: requestId.trim(),
    timestamp: normalizeTimestamp(record.timestamp),
    status,
    data: record.data,
    error: record.error as ChipsResponseMessage['error'],
    metadata: record.metadata as ChipsResponseMessage['metadata']
  };
};

export const parseEventMessage = (value: unknown): ChipsEventMessage => {
  const record = asRecord(value, 'Event message');
  const eventId = record.eventId ?? record.id;
  if (typeof eventId !== 'string' || eventId.trim().length === 0) {
    throw createError('PROTOCOL_EVENT_ID_REQUIRED', 'Event eventId is required');
  }

  return {
    protocolVersion: normalizeVersion(record.protocolVersion ?? record.version),
    eventId: eventId.trim(),
    timestamp: normalizeTimestamp(record.timestamp),
    source: typeof record.source === 'string' ? record.source : 'unknown',
    eventType: normalizeAction(record.eventType ?? record.type ?? record.name),
    payload: record.payload ?? record.data ?? {},
    propagate: typeof record.propagate === 'boolean' ? record.propagate : true
  };
};

export const serializeRequestMessage = (message: ChipsRequestMessage): string => {
  return JSON.stringify(message);
};

export const serializeResponseMessage = (message: ChipsResponseMessage): string => {
  return JSON.stringify(message);
};

export const serializeEventMessage = (message: ChipsEventMessage): string => {
  return JSON.stringify(message);
};

export const parseSerializedRequestMessage = (raw: string): ChipsRequestMessage => {
  return parseRequestMessage(JSON.parse(raw));
};

export const parseSerializedResponseMessage = (raw: string): ChipsResponseMessage => {
  return parseResponseMessage(JSON.parse(raw));
};

export const parseSerializedEventMessage = (raw: string): ChipsEventMessage => {
  return parseEventMessage(JSON.parse(raw));
};
