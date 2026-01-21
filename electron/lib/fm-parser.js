import fs from "fs";
import iconv from "iconv-lite";

const HEADER_SIZE = 0xa00;
const Z_REPORT_SIZE = 162;
const Z_REPORT_SENTINEL_COUNT = 1; // always leave one empty record at the end
const SERIAL_RECORD_SIZE = 32;
const FM_NUMBER_RECORD_SIZE = 32;
const FM_NUMBER_COUNT = 8;
const FM_NUMBERS_BLOCK_SIZE = 0x100; // total space reserved for FM numbers + filler
const VAT_RATE_RECORD_SIZE = 20;
const TAX_ID_RECORD_SIZE = 24;
const TAX_ID_RECORD_COUNT = 10;
const TAX_ID_BLOCK_SIZE = 0x100; // keep overall block size consistent with original layout

const DATE_EMPTY = 0xffff;

const decodeDosDateTime = (time, date) => {
  if (time === DATE_EMPTY && date === DATE_EMPTY) return null;
  const day = date & 0x1f;
  const month = (date >> 5) & 0x0f;
  // DOS stores years as offset from 2000 for this device format
  const year = 2000 + ((date >> 9) & 0x7f);
  const hours = (time >> 11) & 0x1f;
  const minutes = (time >> 5) & 0x3f;
  const seconds = (time & 0x1f) * 2;
  return {
    raw: { time, date },
    iso: new Date(
      Date.UTC(year, month - 1, day, hours, minutes, seconds)
    ).toISOString(),
  };
};

const encodeDosDateTime = (isoString) => {
  if (!isoString) return { time: DATE_EMPTY, date: DATE_EMPTY };
  const d = new Date(isoString);
  // store as offset from 2000
  const year = d.getUTCFullYear() - 2000;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = Math.floor(d.getUTCSeconds() / 2); // DOS stores seconds/2

  const date = (year << 9) | (month << 5) | day;
  const time = (hours << 11) | (minutes << 5) | seconds;
  return { time, date };
};

const readString = (buffer, offset, length) => {
  const raw = buffer.subarray(offset, offset + length);
  return iconv.decode(raw, "windows-1251").replace(/\0+$/, "");
};

const writeString = (buffer, offset, length, value, useFullLength = false) => {
  buffer.fill(0, offset, offset + length);
  if (!value) return;
  const encoded = iconv.encode(value, "windows-1251");
  const maxLen = useFullLength ? length : length - 1;
  const sliceLength = Math.min(encoded.length, maxLen);
  encoded.copy(buffer, offset, 0, sliceLength);
};

const checksumFromSlice = (buffer, start, length) => {
  let sum = 0;
  const end = start + length - 1; // exclude checksum byte
  for (let i = start; i < end; i++) {
    sum = (sum + buffer[i]) & 0xff;
  }
  return sum;
};

const isRecordEmpty = (buffer, start, length) => {
  const end = start + length - 1; // ignore checksum position
  for (let i = start; i < end; i++) {
    if (buffer[i] !== 0xff) return false;
  }
  return true;
};

const applyChecksum = (buffer, start, length) => {
  if (isRecordEmpty(buffer, start, length)) return; // skip checksum for empty records
  buffer[start + length - 1] = checksumFromSlice(buffer, start, length);
};

const readInt40 = (buffer, offset) => {
  let value = 0n;
  for (let i = 0; i < 5; i++) {
    value |= BigInt(buffer[offset + i]) << BigInt(8 * i);
  }
  return value.toString();
};

const writeInt40 = (buffer, offset, value) => {
  let v = BigInt(value ?? 0);
  for (let i = 0; i < 5; i++) {
    buffer[offset + i] = Number((v >> BigInt(8 * i)) & 0xffn);
  }
};

const parseDateTime = (buffer, offset) => {
  const time = buffer.readUInt16LE(offset);
  const date = buffer.readUInt16LE(offset + 2);
  return decodeDosDateTime(time, date);
};

const writeDateTime = (buffer, offset, isoString) => {
  const { time, date } = encodeDosDateTime(isoString);
  buffer.writeUInt16LE(time, offset);
  buffer.writeUInt16LE(date, offset + 2);
};

const createDateResolver = (records, getDate) => {
  const lastIndex = records.length ? records.length - 1 : 0xff;
  const dated = records
    .map((rec, index) => {
      const iso = getDate(rec);
      const time = iso ? Date.parse(iso) : null;
      return { index, time };
    })
    .filter((item) => item.time !== null);

  return (zIso) => {
    if (!records.length) return 0xff;
    const zTime = zIso ? Date.parse(zIso) : NaN;
    if (Number.isNaN(zTime)) return lastIndex;
    const eligible = dated.filter((d) => d.time !== null && d.time <= zTime);
    if (!eligible.length) return lastIndex;
    return eligible[eligible.length - 1].index;
  };
};

const parseSerialRecord = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const countryNumber = buffer.readUInt8(offset + 4);
  const serialNumber = readString(buffer, offset + 5, 26);
  return { dateTime, countryNumber, serialNumber };
};

const writeSerialRecord = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime?.iso);
  buffer.writeUInt8(value.countryNumber ?? 0, offset + 4);
  writeString(buffer, offset + 5, 26, value.serialNumber);
  applyChecksum(buffer, offset, SERIAL_RECORD_SIZE);
};

const parseFMNumberRecord = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const fmNumber = readString(buffer, offset + 4, 27);
  return { dateTime, fmNumber };
};

const writeFMNumberRecord = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime?.iso);
  writeString(buffer, offset + 4, 27, value.fmNumber);
  applyChecksum(buffer, offset, FM_NUMBER_RECORD_SIZE);
};

const parseVatRateChange = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const VatA = buffer.readUInt16LE(offset + 4);
  const VatB = buffer.readUInt16LE(offset + 6);
  const VatC = buffer.readUInt16LE(offset + 8);
  const VatD = buffer.readUInt16LE(offset + 10);
  const VatM = buffer.readUInt16LE(offset + 12);
  const VatH = buffer.readUInt16LE(offset + 14);
  const DecPoint = buffer.readUInt8(offset + 16);
  const VATExcluded = buffer.readUInt8(offset + 17);
  const AssociatedMask = buffer.readUInt8(offset + 18);
  return {
    dateTime,
    VatA,
    VatB,
    VatC,
    VatD,
    VatM,
    VatH,
    DecPoint,
    VATExcluded,
    AssociatedMask,
  };
};

const writeVatRateChange = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime?.iso);
  buffer.writeUInt16LE(value.VatA ?? 0, offset + 4);
  buffer.writeUInt16LE(value.VatB ?? 0, offset + 6);
  buffer.writeUInt16LE(value.VatC ?? 0, offset + 8);
  buffer.writeUInt16LE(value.VatD ?? 0, offset + 10);
  buffer.writeUInt16LE(value.VatM ?? 0, offset + 12);
  buffer.writeUInt16LE(value.VatH ?? 0, offset + 14);
  buffer.writeUInt8(value.DecPoint ?? 0, offset + 16);
  buffer.writeUInt8(value.VATExcluded ?? 0, offset + 17);
  buffer.writeUInt8(value.AssociatedMask ?? 0, offset + 18);
  applyChecksum(buffer, offset, VAT_RATE_RECORD_SIZE);
};

const parseTaxIdRecord = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const type = buffer.readUInt8(offset + 4);
  const lastZReport = buffer.readUInt16LE(offset + 5);
  const taxNumber = readString(buffer, offset + 7, 16);
  return { dateTime, type, lastZReport, taxNumber };
};

const writeTaxIdRecord = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime?.iso);
  buffer.writeUInt8(value.type ?? 0, offset + 4);
  buffer.writeUInt16LE(value.lastZReport ?? 0, offset + 5);
  writeString(buffer, offset + 7, 16, value.taxNumber);
  applyChecksum(buffer, offset, TAX_ID_RECORD_SIZE);
};

const parseTestRecord = (buffer, offset) => parseDateTime(buffer, offset);
const writeTestRecord = (buffer, offset, value) =>
  value ? writeDateTime(buffer, offset, value?.iso) : null;

const zReportFieldOrder = [
  { key: "ZNumber", type: "u16" },
  { key: "DateTime", type: "datetime" },
  { key: "LastDocument", type: "u32" },
  { key: "FiscalCount", type: "u16" },
  { key: "StornoCount", type: "u16" },
  { key: "KSEFNum", type: "u16" },
  { key: "ObigVatA", type: "i40" },
  { key: "ObigVatB", type: "i40" },
  { key: "ObigVatC", type: "i40" },
  { key: "ObigVatD", type: "i40" },
  { key: "ObigVatE", type: "i40" },
  { key: "ObigVatAStorno", type: "i40" },
  { key: "ObigVatBStorno", type: "i40" },
  { key: "ObigVatCStorno", type: "i40" },
  { key: "ObigVatDStorno", type: "i40" },
  { key: "ObigVatEStorno", type: "i40" },
  { key: "SumaVatA", type: "i40" },
  { key: "SumaVatB", type: "i40" },
  { key: "SumaVatC", type: "i40" },
  { key: "SumaVatD", type: "i40" },
  { key: "SumaVatE", type: "i40" },
  { key: "SumaVatAStorno", type: "i40" },
  { key: "SumaVatBStorno", type: "i40" },
  { key: "SumaVatCStorno", type: "i40" },
  { key: "SumaVatDStorno", type: "i40" },
  { key: "SumaVatEStorno", type: "i40" },
  { key: "ZbirVatM", type: "i40" },
  { key: "ZbirVatH", type: "i40" },
  { key: "ZbirVatMStorno", type: "i40" },
  { key: "ZbirVatHStorno", type: "i40" },
  { key: "ZbirVatMTax", type: "i40" },
  { key: "ZbirVatHTax", type: "i40" },
  { key: "ZbirVatMTaxStorno", type: "i40" },
  { key: "ZbirVatHTaxStorno", type: "i40" },
  { key: "salesMode", type: "u8" },
  { key: "FMNumChanges", type: "u8" },
  { key: "LastFiscalizationNum", type: "u8" },
  { key: "TaxNumChanges", type: "u8" },
  { key: "RamResetsCount", type: "u8" },
  { key: "CheckSum", type: "u8" },
];

const parseZReport = (buffer, offset) => {
  const result = {};
  let cursor = offset;
  for (const field of zReportFieldOrder) {
    switch (field.type) {
      case "u16":
        result[field.key] = buffer.readUInt16LE(cursor);
        cursor += 2;
        break;
      case "u32":
        result[field.key] = buffer.readUInt32LE(cursor);
        cursor += 4;
        break;
      case "u8":
        if (
          field.key !== "CheckSum" &&
          ![
            "FMNumChanges",
            "LastFiscalizationNum",
            "TaxNumChanges",
            "RamResetsCount",
          ].includes(field.key)
        ) {
          result[field.key] = buffer.readUInt8(cursor);
        }
        cursor += 1;
        break;
      case "datetime":
        result[field.key] = parseDateTime(buffer, cursor);
        cursor += 4;
        break;
      case "i40":
        result[field.key] = readInt40(buffer, cursor);
        cursor += 5;
        break;
      default:
        throw new Error(`Unknown field type ${field.type}`);
    }
  }
  return result;
};

const writeZReport = (buffer, offset, data = {}) => {
  let cursor = offset;
  for (const field of zReportFieldOrder) {
    const value = data[field.key];
    switch (field.type) {
      case "u16":
        buffer.writeUInt16LE(value ?? 0, cursor);
        cursor += 2;
        break;
      case "u32":
        buffer.writeUInt32LE(value ?? 0, cursor);
        cursor += 4;
        break;
      case "u8":
        // CheckSum is calculated after writing the record
        if (field.key !== "CheckSum") {
          buffer.writeUInt8(value ?? 0, cursor);
        }
        cursor += 1;
        break;
      case "datetime":
        writeDateTime(buffer, cursor, value?.iso);
        cursor += 4;
        break;
      case "i40":
        writeInt40(buffer, cursor, value);
        cursor += 5;
        break;
      default:
        throw new Error(`Unknown field type ${field.type}`);
    }
  }
  applyChecksum(buffer, offset, Z_REPORT_SIZE);
};

export const parseFiscalMemory = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }
  if (buffer.length < HEADER_SIZE) {
    throw new Error("File too small to be a valid fiscal memory dump");
  }

  let offset = 0;

  const flag = buffer.readUInt8(offset);
  offset += 1;

  const idString = readString(buffer, offset, 15);
  offset += 15;

  offset += 0x10; // fill

  const ksefNumbers = Array.from(buffer.subarray(offset, offset + 32));
  offset += 32;

  offset += 0x20; // fill2

  const serialRecord = parseSerialRecord(buffer, offset);
  offset += 32;

  offset += 0x80; // fill3

  const fmNumbers = [];
  for (let i = 0; i < FM_NUMBER_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, FM_NUMBER_RECORD_SIZE)) {
      fmNumbers.push(parseFMNumberRecord(buffer, offset));
    }
    offset += FM_NUMBER_RECORD_SIZE;
  }

  const fmFillSize = Math.max(
    0,
    FM_NUMBERS_BLOCK_SIZE - FM_NUMBER_COUNT * FM_NUMBER_RECORD_SIZE
  );
  offset += fmFillSize; // fill4 adjusted to keep block size consistent

  const vatRates = [];
  for (let i = 0; i < 16; i++) {
    if (!isRecordEmpty(buffer, offset, VAT_RATE_RECORD_SIZE)) {
      vatRates.push(parseVatRateChange(buffer, offset));
    }
    offset += 20;
  }

  offset += 0xc0; // fill5

  const ramResets = [];
  for (let i = 0; i < 100; i++) {
    const dt = parseDateTime(buffer, offset);
    if (dt) ramResets.push(dt);
    offset += 4;
  }

  offset += 0x270; // fill6

  const taxRecords = [];
  for (let i = 0; i < TAX_ID_RECORD_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, TAX_ID_RECORD_SIZE)) {
      taxRecords.push(parseTaxIdRecord(buffer, offset));
    }
    offset += TAX_ID_RECORD_SIZE;
  }

  const taxFillSize = Math.max(
    0,
    TAX_ID_BLOCK_SIZE - TAX_ID_RECORD_COUNT * TAX_ID_RECORD_SIZE
  );
  offset += taxFillSize; // fill7 adjusted to keep block size consistent

  const testRecords = [];
  for (let i = 0; i < 32; i++) {
    const dt = parseTestRecord(buffer, offset);
    if (dt) testRecords.push(dt);
    offset += 4;
  }

  offset += 0x80; // fill8

  const remaining = buffer.length - offset;
  const zClosures = Math.max(0, Math.floor(remaining / Z_REPORT_SIZE));

  const zReports = [];
  for (let i = 0; i < zClosures; i++) {
    if (!isRecordEmpty(buffer, offset, Z_REPORT_SIZE)) {
      zReports.push(parseZReport(buffer, offset));
    }
    offset += Z_REPORT_SIZE;
  }

  return {
    meta: {
      flag,
      idString,
      ksefNumbers,
    },
    serialRecord,
    fmNumbers,
    vatRates,
    ramResets,
    taxRecords,
    testRecords,
    zReports,
  };
};

export const buildFiscalMemory = (data) => {
  const zReportCount = data?.zReports?.length ?? 0;
  const totalZReportSlots = zReportCount + Z_REPORT_SENTINEL_COUNT;
  const baseSize = HEADER_SIZE + totalZReportSlots * Z_REPORT_SIZE;
  const alignedSize = Math.ceil(baseSize / 16) * 16;
  const buffer = Buffer.alloc(alignedSize, 0xff);

  const fmResolver = createDateResolver(
    data?.fmNumbers ?? [],
    (rec) => rec?.dateTime?.iso
  );
  const vatResolver = createDateResolver(
    data?.vatRates ?? [],
    (rec) => rec?.dateTime?.iso
  );
  const taxResolver = createDateResolver(
    data?.taxRecords ?? [],
    (rec) => rec?.dateTime?.iso
  );
  const resetResolver = createDateResolver(
    data?.ramResets ?? [],
    (rec) => rec?.iso
  );

  let offset = 0;
  buffer.writeUInt8(data?.meta?.flag ?? 0, offset);
  offset += 1;

  writeString(buffer, offset, 15, data?.meta?.idString ?? "", true);
  offset += 15;

  offset += 0x10; // fill

  const ksef = data?.meta?.ksefNumbers ?? [];
  for (let i = 0; i < 32; i++) {
    buffer.writeUInt8(ksef[i] ?? 0, offset + i);
  }
  offset += 32;

  offset += 0x20; // fill2

  writeSerialRecord(buffer, offset, data?.serialRecord);
  offset += 32;

  offset += 0x80; // fill3

  for (let i = 0; i < FM_NUMBER_COUNT; i++) {
    writeFMNumberRecord(buffer, offset, data?.fmNumbers?.[i]);
    offset += FM_NUMBER_RECORD_SIZE;
  }

  const fmFillSize = Math.max(
    0,
    FM_NUMBERS_BLOCK_SIZE - FM_NUMBER_COUNT * FM_NUMBER_RECORD_SIZE
  );
  offset += fmFillSize; // fill4 adjusted to keep block size consistent

  for (let i = 0; i < 16; i++) {
    writeVatRateChange(buffer, offset, data?.vatRates?.[i]);
    offset += 20;
  }

  offset += 0xc0; // fill5

  for (let i = 0; i < 100; i++) {
    writeTestRecord(buffer, offset, data?.ramResets?.[i]);
    offset += 4;
  }

  offset += 0x270; // fill6

  for (let i = 0; i < TAX_ID_RECORD_COUNT; i++) {
    writeTaxIdRecord(buffer, offset, data?.taxRecords?.[i]);
    offset += TAX_ID_RECORD_SIZE;
  }

  const taxFillSize = Math.max(
    0,
    TAX_ID_BLOCK_SIZE - TAX_ID_RECORD_COUNT * TAX_ID_RECORD_SIZE
  );
  offset += taxFillSize; // fill7 adjusted to keep block size consistent

  for (let i = 0; i < 32; i++) {
    writeTestRecord(buffer, offset, data?.testRecords?.[i]);
    offset += 4;
  }

  offset += 0x80; // fill8

  for (let i = 0; i < zReportCount; i++) {
    const zData = data?.zReports?.[i] ?? {};
    const zDateIso = zData?.DateTime?.iso;
    const computedValues = {
      TaxNumChanges: vatResolver(zDateIso),
      RamResetsCount: resetResolver(zDateIso),
      LastFiscalizationNum: taxResolver(zDateIso),
      FMNumChanges: fmResolver(zDateIso),
    };
    writeZReport(buffer, offset, { ...zData, ...computedValues });
    offset += Z_REPORT_SIZE;
  }

  return buffer;
};

export const loadFiscalMemoryFile = async (filePath) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  return parseFiscalMemory(fileBuffer);
};

export const saveFiscalMemoryFile = async (filePath, data) => {
  const buffer = buildFiscalMemory(data);
  await fs.promises.writeFile(filePath, buffer);
  return { success: true };
};
