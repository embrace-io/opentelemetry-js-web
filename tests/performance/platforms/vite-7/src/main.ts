import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  SimpleSpanProcessor,
  WebTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { ZoneContextManager } from '@opentelemetry/context-zone';

let batchSpanProcessor: BatchSpanProcessor;
let batchLogProcessor: BatchLogRecordProcessor;

const initOTel = () => {
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'vite-7-integration-test',
      [ATTR_SERVICE_VERSION]: '0.0.1',
    })
  );

  // Spans set up
  const simpleSpanProcessor = new SimpleSpanProcessor(
    new ConsoleSpanExporter()
  );
  batchSpanProcessor = new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'http://localhost:3000/v1/traces',
      timeoutMillis: 1000,
    })
  );

  const provider = new WebTracerProvider({
    resource: resource,
    spanProcessors: [simpleSpanProcessor, batchSpanProcessor],
  });

  const simpleLogProcessor = new SimpleLogRecordProcessor(
    new ConsoleLogRecordExporter()
  );

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new B3Propagator(),
  });

  // Logs set up
  batchLogProcessor = new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: 'http://localhost:3000/v1/logs',
    })
  );

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [simpleLogProcessor, batchLogProcessor],
  });

  logs.setGlobalLoggerProvider(loggerProvider);

  // Instrumentations set up
  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });
};

(window as any).OTelSDK = {
  initOTel,
  flush: async () => {
    await batchSpanProcessor.forceFlush();
    await batchLogProcessor.forceFlush();
  },
  log: (message: string) => {
    const logger = logs.getLogger('default');
    logger.emit({
      body: message,
      severityNumber: SeverityNumber.INFO,
    });
  },
  logException: (error: Error) => {
    const logger = logs.getLogger('default');
    logger.emit({
      body: error.message,
      severityNumber: SeverityNumber.ERROR,
      attributes: {
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
    });
  },
};
