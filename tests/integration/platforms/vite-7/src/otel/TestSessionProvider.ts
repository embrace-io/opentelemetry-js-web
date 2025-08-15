import type { SessionProvider } from '@opentelemetry/web-common';
import { generateUUID } from './generateUUID';

declare global {
  interface Window {
    TEST_CURRENT_SESSION_ID: string | null;
  }
}

class TestSessionProvider implements SessionProvider {
  private _currentSessionId: string;

  constructor() {
    this._currentSessionId = generateUUID();
    window.TEST_CURRENT_SESSION_ID = this._currentSessionId;
  }

  getSessionId(): string {
    return this._currentSessionId;
  }
}

export default TestSessionProvider;
