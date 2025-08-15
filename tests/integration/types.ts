declare global {
  interface Window {
    TEST_CURRENT_SESSION_ID: string | null;
  }
}

type ReceivedSpans = Record<string, boolean>;

export type { ReceivedSpans };
