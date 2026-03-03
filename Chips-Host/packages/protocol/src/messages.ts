import type { StandardError } from '../../../src/shared/types';

export interface ChipsRequestMessage {
  protocolVersion: string;
  messageId: string;
  timestamp: string;
  sender: string;
  service: string;
  payload: unknown;
  options?: {
    timeout?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    trace?: boolean;
  };
}

export interface ChipsResponseMessage {
  protocolVersion: string;
  messageId: string;
  requestId: string;
  timestamp: string;
  status: 'success' | 'error' | 'partial';
  data?: unknown;
  error?: StandardError;
  metadata?: {
    executionTime: number;
    cacheHit: boolean;
  };
}

export interface ChipsEventMessage {
  protocolVersion: string;
  eventId: string;
  timestamp: string;
  source: string;
  eventType: string;
  payload: unknown;
  propagate: boolean;
}
