export type FiscalDateTime = {
  raw: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minutes: number;
    seconds: number;
    mseconds: number;
  };
  iso: string;
};

export type SerialRecord = {
  serialNumber: string;
  dateTime: FiscalDateTime | null;
};

export type FiscalModeStart = {
  dateTime: FiscalDateTime | null;
};

export type FMNumberRecord = {
  fmNumber: string;
  dateTime: FiscalDateTime | null;
};

export type VatRateChange = {
  VatA: number;
  VatB: number;
  VatC: number;
  VatD: number;
  VatE: number;
  VatF: number;
  VatG: number;
  VatH: number;
  VatAzbir: number;
  VatBzbir: number;
  VatCzbir: number;
  VatDzbir: number;
  VatEzbir: number;
  VatFzbir: number;
  VatGzbir: number;
  VatHzbir: number;
  dateTime: FiscalDateTime | null;
  NextZNumber: number;
  VATExcluded: number;
  DecPoint: number;
};

export type TaxIdRecord = {
  type: number;
  taxNumber: string;
  dateTime: FiscalDateTime | null;
};

export type RamResetRecord = {
  dateTime: FiscalDateTime | null;
  NextZNumber: number;
  Flag: number;
};

export type ZReport = {
  ZNumber: number;
  DateTime: FiscalDateTime | null;
  FMNumChanges: number;
  TaxNumChanges: number;
  VatChanges: number;
  RamResetsCount: number;
  LastDocument: number;
  LastFiscal: number;
  LastStorno: number;
  FiscalCount: number;
  StornoCount: number;
  ObigVatA: string;
  ObigVatB: string;
  ObigVatC: string;
  ObigVatD: string;
  ObigVatE: string;
  ObigVatF: string;
  ObigVatG: string;
  ObigVatH: string;
  ObigVatAStorno: string;
  ObigVatBStorno: string;
  ObigVatCStorno: string;
  ObigVatDStorno: string;
  ObigVatEStorno: string;
  ObigVatFStorno: string;
  ObigVatGStorno: string;
  ObigVatHStorno: string;
  SumaVatA: string;
  SumaVatB: string;
  SumaVatC: string;
  SumaVatD: string;
  SumaVatE: string;
  SumaVatF: string;
  SumaVatG: string;
  SumaVatH: string;
  SumaVatAStorno: string;
  SumaVatBStorno: string;
  SumaVatCStorno: string;
  SumaVatDStorno: string;
  SumaVatEStorno: string;
  SumaVatFStorno: string;
  SumaVatGStorno: string;
  SumaVatHStorno: string;
  ZbirVatA: string;
  ZbirVatB: string;
  ZbirVatC: string;
  ZbirVatD: string;
  ZbirVatE: string;
  ZbirVatF: string;
  ZbirVatG: string;
  ZbirVatH: string;
  ZbirVatAStorno: string;
  ZbirVatBStorno: string;
  ZbirVatCStorno: string;
  ZbirVatDStorno: string;
  ZbirVatEStorno: string;
  ZbirVatFStorno: string;
  ZbirVatGStorno: string;
  ZbirVatHStorno: string;
  CheckSum?: number;
};

export type EJOpenRecord = {
  dateTime: FiscalDateTime | null;
  lastRecOnOpening: number;
  lastZOnOpening: number;
};

export type EJCloseRecord = {
  dateTime: FiscalDateTime | null;
  lastRecOnClose: number;
  lastZOnClose: number;
  lostOrBroken: number;
};

export type FiscalWarning = {
  type: "checksum" | "future-date";
  recordType: string;
  index: number;
  offset: number;
  message: string;
};

export type FiscalMemoryDump = {
  serialRecord: SerialRecord | null;
  fiscalModeStart: FiscalModeStart | null;
  fmNumbers: FMNumberRecord[];
  taxNumbers: TaxIdRecord[];
  vatRateChanges: VatRateChange[];
  ramResets: RamResetRecord[];
  zReports: ZReport[];
  ejOpen: EJOpenRecord[];
  ejClose: EJCloseRecord[];
  cpuId: number[];
  warnings?: FiscalWarning[];
};
