// import type { SuccessResponse, ErrorResponse } from "./lib/types";
import type { FiscalMemoryDump, ZReport } from "./lib/fm-types";

export {};

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      openFiscalMemory: () => Promise<
        | {
            filePath: string;
            data: FiscalMemoryDump;
          }
        | null
      >;
      parseFiscalMemory: (
        buffer: ArrayBuffer | Buffer
      ) => Promise<FiscalMemoryDump>;
      saveFiscalMemoryAs: (
        data: FiscalMemoryDump,
        defaultPath?: string
      ) => Promise<{ filePath: string; success: true } | null>;
      saveFiscalMemoryToPath: (
        filePath: string,
        data: FiscalMemoryDump
      ) => Promise<{ filePath: string; success: true }>;
      importZReports: () => Promise<
        | { filePath: string; reports: ZReport[] }
        | null
      >;
      checkForUpdates: () => Promise<
        | { status: "up-to-date" }
        | { status: "downloaded"; version: string }
        | { status: "unavailable"; message: string }
        | { status: "error"; message: string }
      >;
      installUpdate: () => Promise<
        | { status: "installing" }
        | { status: "unavailable"; message: string }
        | { status: "error"; message: string }
      >;
      onUpdateDownloadProgress: (
        callback: (info: {
          percent: number;
          bytesPerSecond: number;
          transferred: number;
          total: number;
        }) => void
      ) => void;
    };
  }
}
