import { create } from "zustand";
import type {
  FiscalMemoryDump,
  FiscalModeStart,
  FMNumberRecord,
  RamResetRecord,
  SerialRecord,
  TaxIdRecord,
  VatRateChange,
  ZReport,
} from "@/lib/fm-types";

type FiscalState = {
  data: FiscalMemoryDump | null;
  path: string | null;
  message: string | null;
  setData: (data: FiscalMemoryDump | null) => void;
  setSerial: (serial: SerialRecord) => void;
  setFiscalModeStart: (record: FiscalModeStart) => void;
  setFMNumbers: (fmNumbers: FMNumberRecord[]) => void;
  setVatRateChanges: (rates: VatRateChange[]) => void;
  setRamResets: (resets: RamResetRecord[]) => void;
  setTaxNumbers: (records: TaxIdRecord[]) => void;
  setPath: (path: string | null) => void;
  setMessage: (message: string | null) => void;
  setZReports: (updater: (reports: ZReport[]) => ZReport[]) => void;
};

export const useFiscalStore = create<FiscalState>((set) => ({
  data: null,
  path: null,
  message: null,
  setData: (data) => set({ data }),
  setSerial: (serial) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, serialRecord: serial } };
    }),
  setFiscalModeStart: (record) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, fiscalModeStart: record } };
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
  setTaxNumbers: (records) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, taxNumbers: records } };
    }),
  setPath: (path) => set({ path }),
  setMessage: (message) => set({ message }),
  setVatRateChanges: (rates) =>
    set((state) => {
      if (!state.data) return state;
      return { ...state, data: { ...state.data, vatRateChanges: rates } };
    }),
  setZReports: (updater) =>
    set((state) => {
      if (!state.data) return state;
      const next = updater(state.data.zReports ?? []);
      return { ...state, data: { ...state.data, zReports: next } };
    }),
}));
