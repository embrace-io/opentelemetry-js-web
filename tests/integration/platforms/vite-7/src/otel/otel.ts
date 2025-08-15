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
import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import {
  createSessionLogRecordProcessor,
  createSessionSpanProcessor,
} from '@opentelemetry/web-common';
import TestSessionProvider from './TestSessionProvider';

const resource = defaultResource().merge(
  resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'vite-7-integration-test',
    [ATTR_SERVICE_VERSION]: '0.0.1',
  })
);

const sessionProvider = new TestSessionProvider();

// Spans set up
const simpleSpanProcessor = new SimpleSpanProcessor(new ConsoleSpanExporter());
const batchSpanProcessor = new BatchSpanProcessor(
  new OTLPTraceExporter({
    url: 'http://localhost:3001/v1/traces',
    timeoutMillis: 1000,
  })
);

const provider = new WebTracerProvider({
  resource: resource,
  spanProcessors: [
    createSessionSpanProcessor(sessionProvider),
    simpleSpanProcessor,
    batchSpanProcessor,
  ],
});

const simpleLogProcessor = new SimpleLogRecordProcessor(
  new ConsoleLogRecordExporter()
);

provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});

// Logs set up
const batchLogProcessor = new BatchLogRecordProcessor(
  new OTLPLogExporter({
    url: 'http://localhost:3001/v1/logs',
  })
);

const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    createSessionLogRecordProcessor(sessionProvider),
    simpleLogProcessor,
    batchLogProcessor,
  ],
});

logs.setGlobalLoggerProvider(loggerProvider);

// Instrumentations set up
registerInstrumentations({
  instrumentations: [getWebAutoInstrumentations()],
});

export { batchSpanProcessor, batchLogProcessor };
