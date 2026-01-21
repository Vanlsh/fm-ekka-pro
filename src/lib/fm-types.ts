export type FiscalDateTime = {
  raw: { time: number; date: number };
  iso: string;
};

export type SerialRecord = {
  dateTime: FiscalDateTime | null;
  countryNumber: number;
  serialNumber: string;
};

export type FMNumberRecord = {
  dateTime: FiscalDateTime | null;
  fmNumber: string;
};

export type VatRateChange = {
  dateTime: FiscalDateTime | null;
  VatA: number;
  VatB: number;
  VatC: number;
  VatD: number;
  VatM: number;
  VatH: number;
  DecPoint: number;
  VATExcluded: number;
  AssociatedMask: number;
};

export type TaxIdRecord = {
  dateTime: FiscalDateTime | null;
  type: number;
  lastZReport: number;
  taxNumber: string;
};

export type ZReport = {
  ZNumber: number;
  DateTime: FiscalDateTime | null;
  LastDocument: number;
  FiscalCount: number;
  StornoCount: number;
  KSEFNum: number;
  ObigVatA: string;
  ObigVatB: string;
  ObigVatC: string;
  ObigVatD: string;
  ObigVatE: string;
  ObigVatAStorno: string;
  ObigVatBStorno: string;
  ObigVatCStorno: string;
  ObigVatDStorno: string;
  ObigVatEStorno: string;
  SumaVatA: string;
  SumaVatB: string;
  SumaVatC: string;
  SumaVatD: string;
  SumaVatE: string;
  SumaVatAStorno: string;
  SumaVatBStorno: string;
  SumaVatCStorno: string;
  SumaVatDStorno: string;
  SumaVatEStorno: string;
  ZbirVatM: string;
  ZbirVatH: string;
  ZbirVatMStorno: string;
  ZbirVatHStorno: string;
  ZbirVatMTax: string;
  ZbirVatHTax: string;
  ZbirVatMTaxStorno: string;
  ZbirVatHTaxStorno: string;
  salesMode: number;
  // The following counters are derived during write; they may be absent when parsed.
  FMNumChanges?: number;
  LastFiscalizationNum?: number;
  TaxNumChanges?: number;
  RamResetsCount?: number;
};

export type FiscalMemoryMeta = {
  flag: number;
  idString: string;
  ksefNumbers: number[];
};

export type FiscalMemoryDump = {
  meta: FiscalMemoryMeta;
  serialRecord: SerialRecord | null;
  fmNumbers: FMNumberRecord[];
  vatRates: VatRateChange[];
  ramResets: (FiscalDateTime | null)[];
  taxRecords: TaxIdRecord[];
  testRecords: (FiscalDateTime | null)[];
  zReports: ZReport[];
};
