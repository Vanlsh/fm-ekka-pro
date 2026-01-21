import { create } from "zustand";
import type {
  FiscalMemoryDump,
  FiscalMemoryMeta,
  FMNumberRecord,
  SerialRecord,
  VatRateChange,
  TaxIdRecord,
  ZReport,
} from "@/lib/fm-types";

type FiscalState = {
  data: FiscalMemoryDump | null;
  path: string | null;
  message: string | null;
  setData: (data: FiscalMemoryDump | null) => void;
  setMeta: (meta: FiscalMemoryMeta) => void;
  setSerial: (serial: SerialRecord) => void;
  setFMNumbers: (fmNumbers: FMNumberRecord[]) => void;
  setVatRates: (rates: VatRateChange[]) => void;
  setRamResets: (resets: (FiscalMemoryDump["ramResets"][number])[]) => void;
  setTaxRecords: (records: TaxIdRecord[]) => void;
  clearTestRecords: () => void;
  setPath: (path: string | null) => void;
  setMessage: (message: string | null) => void;
  setZReports: (updater: (reports: ZReport[]) => ZReport[]) => void;
};

export const useFiscalStore = create<FiscalState>((set) => ({
  data: null,
  path: null,
  message: null,
  setData: (data) => set({ data }),
  setMeta: (meta) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, meta } };
    }),
  setSerial: (serial) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, serialRecord: serial } };
    }),
  setFMNumbers: (fmNumbers) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, fmNumbers } };
    }),
  setRamResets: (resets) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, ramResets: resets } };
    }),
  setTaxRecords: (records) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, taxRecords: records } };
    }),
  setPath: (path) => set({ path }),
  setMessage: (message) => set({ message }),
  setVatRates: (rates) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, vatRates: rates } };
    }),
  clearTestRecords: () =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, testRecords: [] } };
    }),
  setZReports: (updater) =>
    set((state) => {
      if (!state.data) return state;
      const next = updater(state.data.zReports ?? []);
      return { ...state, data: { ...state.data, zReports: next } };
    }),
}));
