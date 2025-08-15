import testWithMockApi, {
  expect as extendedMockApiTestExpect,
} from './test-with-mock-api.js';
import type { ReceivedSpans } from '../index.js';

type E2ETestFixture = {
  getCurrentSessionId: () => Promise<string>;
  navigateAndWaitUntilReady: (
    url: string,
    numberOfExpectedSpans: number
  ) => Promise<void>;
  validateThatSessionEnded: (sessionId?: string) => Promise<void>;
};

const testE2E = testWithMockApi.extend<E2ETestFixture>({
  getCurrentSessionId: async ({ page }, use) => {
    await use(async () => {
      const sessionId = await page.evaluate(
        () => window.TEST_CURRENT_SESSION_ID,
        {}
      );

      if (!sessionId) {
        throw new Error('Session ID is not available on the page');
      }

      return sessionId;
    });
  },
  navigateAndWaitUntilReady: async ({ page }, use) => {
    await use(async (url: string, numberOfExpectedSpans: number) => {
      let autoInstrumentedSpansCount = 0;
      // This depends on the SDK logging
      // Spans on the console using the ConsoleExporter
      // when a span ends, and it is waiting for a fixed number of auto-instrumented spans to be created on page load
      // Adding more spans or changing the number of spans may require adjusting the test expectations
      // But it's better than waiting a random amount of time for everything to settle
      page.on('console', () => {
        autoInstrumentedSpansCount++;
      });

      await page.goto(url);

      // Set a 5 seconds timeout for the page to load
      const timeout = setTimeout(() => {
        throw new Error('Page did not load within 5 seconds');
      }, 5000);

      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (autoInstrumentedSpansCount >= numberOfExpectedSpans) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(null);
          }
        }, 100);
      });
    });
  },
  validateThatSessionEnded: async ({ getCurrentSessionId }, use) => {
    await use(async (sessionId?: string) => {
      const currentSessionId = sessionId || (await getCurrentSessionId());

      // Easy way of making sure the server registered the session end
      // If this gets flaky, we can increase the timeout or read the server logs
      const timeout = setTimeout(() => {
        throw new Error('Server did not register the session end in time');
      }, 5000);

      await new Promise(resolve => {
        const interval = setInterval(async () => {
          const response = await fetch('http://localhost:3001/received-spans');
          const receivedSpans = (await response.json()) as ReceivedSpans;

          if (receivedSpans[currentSessionId]) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(null);
          }
        }, 200);
      });
    });
  },
});

type RunE2ETestsOptions = {
  url: string;
  name: string;
  numberOfExpectedSpans: number;
};

const runE2ETests = ({
  url,
  name,
  numberOfExpectedSpans,
}: RunE2ETestsOptions) => {
  const codifiedName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  testE2E.describe(`${name} E2E Tests`, () => {
    testE2E(
      'it should load the home page without errors',
      async ({ navigateAndWaitUntilReady }) => {
        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
      }
    );

    testE2E(
      'It should have the necessary buttons to test the page',
      async ({ page, navigateAndWaitUntilReady }) => {
        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);

        await testE2E
          .expect(
            page.getByRole('button', {
              name: 'End Session',
            })
          )
          .toBeVisible();
        await testE2E
          .expect(page.getByRole('button', { name: 'Send Log' }))
          .toBeVisible();
        await testE2E
          .expect(
            page.getByRole('button', {
              name: 'Navigate to Another Page',
            })
          )
          .toBeVisible();
      }
    );

    testE2E(
      'it should flush all spans and send a request to the API',
      async ({
        traceRequests,
        waitForTraceRequest,
        navigateAndWaitUntilReady,
        page,
        browserName,
      }) => {
        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
        const button = page.getByRole('button', { name: 'End Session' });
        await button.click();
        await waitForTraceRequest();

        if (traceRequests.length === 0) {
          // Small hack to avoid some flakiness where sometimes the response has returned but `requests` was not
          // yet populated
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        testE2E.expect(traceRequests).toHaveLength(1);

        if (browserName === 'webkit') {
          // Skipping golden file check for WebKit since the log request payload is empty
          // due to sendBeacon data not being available in WebKit
          return;
        }

        extendedMockApiTestExpect(traceRequests[0]).toMatchGoldenFile(
          `${browserName}-${codifiedName}-session.json`
        );
      }
    );

    testE2E(
      'it should send a log',
      async ({
        page,
        logRequests,
        waitForLogRequest,
        navigateAndWaitUntilReady,
        browserName,
      }) => {
        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);

        const button = page.getByRole('button', { name: 'Send Log' });
        await button.click();
        await waitForLogRequest();

        if (logRequests.length === 0) {
          // Small hack to avoid some flakiness where sometimes the response has returned but `requests` was not
          // yet populated
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        testE2E.expect(logRequests).toHaveLength(1);

        if (browserName === 'webkit') {
          // Skipping golden file check for WebKit since the log request payload is empty
          // due to sendBeacon data not being available in WebKit
          return;
        }

        extendedMockApiTestExpect(logRequests[0]).toMatchGoldenFile(
          `${browserName}-${codifiedName}-send-log.json`
        );
      }
    );

    testE2E(
      'it should send all data to the API if the page closes',
      async ({
        navigateAndWaitUntilReady,
        page,
        validateThatSessionEnded,
        getCurrentSessionId,
        browserName,
      }) => {
        testE2E.skip(browserName === 'webkit', 'Skipping on WebKit');

        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
        const currentSessionId = await getCurrentSessionId();

        await page.close();

        await validateThatSessionEnded(currentSessionId);
      }
    );

    testE2E(
      'it should send all data to the API if the page refreshes',
      async ({
        navigateAndWaitUntilReady,
        page,
        validateThatSessionEnded,
        getCurrentSessionId,
      }) => {
        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
        const currentSessionId = await getCurrentSessionId();

        await page.reload();

        await validateThatSessionEnded(currentSessionId);
      }
    );

    testE2E(
      'it should send all data to the API if the user navigates to another page',
      async ({
        navigateAndWaitUntilReady,
        page,
        validateThatSessionEnded,
        getCurrentSessionId,
        browserName,
      }) => {
        testE2E.skip(browserName === 'webkit', 'Skipping on WebKit');

        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
        const currentSessionId = await getCurrentSessionId();

        const button = page.getByRole('button', {
          name: 'Navigate to Another Page',
        });
        await button.click();

        await validateThatSessionEnded(currentSessionId);
      }
    );

    testE2E(
      'it should send all data to the API if the user navigates to another page via the browser bar',
      async ({
        navigateAndWaitUntilReady,
        page,
        validateThatSessionEnded,
        getCurrentSessionId,
        browserName,
      }) => {
        testE2E.skip(browserName === 'webkit', 'Skipping on WebKit');

        await navigateAndWaitUntilReady(url, numberOfExpectedSpans);
        const currentSessionId = await getCurrentSessionId();

        // Simulate navigation by changing the URL directly
        // This is a workaround since Playwright does not support changing the URL bar directly
        // Not exactly the same as a user typing in the URL bar, but is the best we can do
        await page.goto('about:blank');

        await validateThatSessionEnded(currentSessionId);
      }
    );

    testE2E.skip(
      '[REQUIRES MANUAL TESTING] it should send all data to the API if the browser closes',
      async () => {
        // This test is skipped because Playwright does not support closing the browser programmatically
        // in a way that would trigger the session end. It requires manual intervention.
        // You can run this test manually by closing the browser after navigating to the page.
        // browser.close() kills the browser instance immediately, without triggering the session end.
        // await browser.close();
      }
    );
  });
};

export default runE2ETests;
