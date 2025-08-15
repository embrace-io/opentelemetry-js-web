import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type SondaResource = {
  kind: 'filesystem' | 'chunk';
  name: string;
  type: 'image' | 'script';
  uncompressed: number;
  gzip: number;
};

type SondaReport = {
  metadata: {
    gzip: boolean;
    brotli: boolean;
  };
  resources: SondaResource[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPEN_TELEMETRY_SDK_PATH_REGEX = new RegExp(/@opentelemetry/);

/**
 * Processes a Sonda report to calculate the total uncompressed and gzip sizes of resources in kb.
 */
const processSondaReport = async (sondaReportPath: string) => {
  const reportPath = resolve(__dirname, sondaReportPath);
  const raw = readFileSync(reportPath, 'utf-8');
  const sondaReport: SondaReport = JSON.parse(raw);

  let totalUncompressedSize = 0;
  let totalGzipSize = 0;

  for (const resource of sondaReport.resources) {
    if (
      resource.kind !== 'chunk' ||
      !resource.name.match(OPEN_TELEMETRY_SDK_PATH_REGEX)
    ) {
      continue;
    }

    totalUncompressedSize += resource.uncompressed || 0;
    totalGzipSize += resource.gzip || 0;
  }

  return {
    totalUncompressedSize: totalUncompressedSize / 1024, // Convert to KB
    totalGzipSize: totalGzipSize / 1024, // Convert to KB
  };
};

export default processSondaReport;
