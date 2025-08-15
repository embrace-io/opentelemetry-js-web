import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { batchLogProcessor, batchSpanProcessor } from './otel/otel';

const logger = logs.getLogger('vite-7-integration-test', '0.0.1');

const SDKTest = () => {
  const handleSendLog = async () => {
    logger.emit({
      body: 'This is a test log message',
      severityNumber: SeverityNumber.INFO,
    });
    await batchLogProcessor.forceFlush();
  };

  const handleEndSession = async () => {
    await batchSpanProcessor.forceFlush();
    await batchLogProcessor.forceFlush();
  };

  const handleNavigateToAnotherPage = () => {
    window.location.href = 'about:blank';
  };

  return (
    <section>
      <button onClick={handleSendLog}>Send Log</button>
      <button onClick={handleEndSession}>End Session</button>
      <button onClick={handleNavigateToAnotherPage}>
        Navigate to Another Page
      </button>
    </section>
  );
};

export default SDKTest;
