const fs = require("fs");
const iconv = require("iconv-lite");

const FILE_SIZE = 0x200000;
const TEST_SPACE_SIZE = 24 * 16;
const SERIAL_RECORD_SIZE = 24;
const FISCAL_MODE_START_SIZE = 16;
const FM_NUMBER_RECORD_SIZE = 24;
const FM_NUMBER_COUNT = 8;
const TAX_ID_RECORD_SIZE = 32;
const TAX_ID_COUNT = 8;
const VAT_RATE_RECORD_SIZE = 48;
const VAT_RATE_COUNT = 32;
const RAM_RESET_RECORD_SIZE = 16;
const RAM_RESET_COUNT = 100;
const Z_REPORT_SIZE = 432;
const Z_REPORT_COUNT = 4500;
const EJ_RECORD_SIZE = 24;
const EJ_RECORD_COUNT = 20;
const NOT_USED_SIZE = 148168;
const CPU_ID_SIZE = 16;

const CHECKSUM_SEED = 0xa5;

const readString = (buffer, offset, length) => {
  const raw = buffer.subarray(offset, offset + length);
  return iconv.decode(raw, "windows-1251").replace(/\0+$/, "");
};

const writeString = (buffer, offset, length, value) => {
  buffer.fill(0, offset, offset + length);
  if (!value) return;
  const encoded = iconv.encode(value, "windows-1251");
  const sliceLength = Math.min(encoded.length, length);
  encoded.copy(buffer, offset, 0, sliceLength);
};

const isRecordEmpty = (buffer, start, length) => {
  const end = start + length - 1;
  for (let i = start; i < end; i++) {
    if (buffer[i] !== 0xff) return false;
  }
  return true;
};

const checksumFromSlice = (buffer, start, length) => {
  let crc = CHECKSUM_SEED;
  const end = start + length - 1;
  for (let i = start; i < end; i++) {
    crc ^= buffer[i];
  }
  return crc & 0xff;
};

const applyChecksum = (buffer, start, length) => {
  if (isRecordEmpty(buffer, start, length)) return;
  buffer[start + length - 1] = checksumFromSlice(buffer, start, length);
};

const verifyChecksum = (buffer, start, length) => {
  if (isRecordEmpty(buffer, start, length)) return true;
  const expected = buffer[start + length - 1];
  const actual = checksumFromSlice(buffer, start, length);
  return expected === actual;
};

const isFutureIso = (iso) => {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  return ts > Date.now();
};

const readUInt64LE = (buffer, offset) => {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(buffer[offset + i]) << BigInt(8 * i);
  }
  return value.toString();
};

const writeUInt64LE = (buffer, offset, value) => {
  let v = 0n;
  try {
    v = BigInt(value ?? 0);
  } catch {
    v = 0n;
  }
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number((v >> BigInt(8 * i)) & 0xffn);
  }
};

const parseDateTime = (buffer, offset) => {
  const year = buffer.readUInt16LE(offset);
  const month = buffer.readUInt8(offset + 2);
  const day = buffer.readUInt8(offset + 3);
  const hour = buffer.readUInt8(offset + 4);
  const minutes = buffer.readUInt8(offset + 5);
  const seconds = buffer.readUInt8(offset + 6);
  const mseconds = buffer.readUInt8(offset + 7);

  const allEmpty =
    year === 0xffff &&
    month === 0xff &&
    day === 0xff &&
    hour === 0xff &&
    minutes === 0xff &&
    seconds === 0xff &&
    mseconds === 0xff;

  if (allEmpty) return null;

  const iso = new Date(
    Date.UTC(
      year,
      Math.max(0, month - 1),
      day,
      hour,
      minutes,
      seconds,
      Math.min(999, mseconds * 10),
    ),
  ).toISOString();

  return {
    raw: { year, month, day, hour, minutes, seconds, mseconds },
    iso,
  };
};

const writeDateTime = (buffer, offset, value) => {
  if (!value) return;
  let fields = value.raw;
  if (!fields && value.iso) {
    const d = new Date(value.iso);
    if (Number.isNaN(d.getTime())) return;
    fields = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minutes: d.getUTCMinutes(),
      seconds: d.getUTCSeconds(),
      mseconds: Math.floor(d.getUTCMilliseconds() / 10),
    };
  }
  if (!fields) return;
  buffer.writeUInt16LE(fields.year ?? 0, offset);
  buffer.writeUInt8(fields.month ?? 0, offset + 2);
  buffer.writeUInt8(fields.day ?? 0, offset + 3);
  buffer.writeUInt8(fields.hour ?? 0, offset + 4);
  buffer.writeUInt8(fields.minutes ?? 0, offset + 5);
  buffer.writeUInt8(fields.seconds ?? 0, offset + 6);
  buffer.writeUInt8(fields.mseconds ?? 0, offset + 7);
};

const parseSerialRecord = (buffer, offset) => {
  const serialNumber = readString(buffer, offset, 10);
  const dateTime = parseDateTime(buffer, offset + 10);
  return { serialNumber, dateTime };
};

const writeSerialRecord = (buffer, offset, value) => {
  if (!value) return;
  writeString(buffer, offset, 10, value.serialNumber);
  writeDateTime(buffer, offset + 10, value.dateTime);
  buffer.fill(0, offset + 18, offset + 23);
  applyChecksum(buffer, offset, SERIAL_RECORD_SIZE);
};

const parseFiscalModeStart = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  return { dateTime };
};

const writeFiscalModeStart = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime);
  buffer.fill(0, offset + 8, offset + 15);
  applyChecksum(buffer, offset, FISCAL_MODE_START_SIZE);
};

const parseFMNumberRecord = (buffer, offset) => {
  const fmNumber = readString(buffer, offset, 10);
  const dateTime = parseDateTime(buffer, offset + 10);
  return { fmNumber, dateTime };
};

const writeFMNumberRecord = (buffer, offset, value) => {
  if (!value) return;
  writeString(buffer, offset, 10, value.fmNumber);
  writeDateTime(buffer, offset + 10, value.dateTime);
  buffer.fill(0, offset + 18, offset + 23);
  applyChecksum(buffer, offset, FM_NUMBER_RECORD_SIZE);
};

const parseTaxIdRecord = (buffer, offset) => {
  const type = buffer.readUInt8(offset);
  const taxNumber = readString(buffer, offset + 1, 12);
  const dateTime = parseDateTime(buffer, offset + 14);
  return { type, taxNumber, dateTime };
};

const writeTaxIdRecord = (buffer, offset, value) => {
  if (!value) return;
  buffer.writeUInt8(value.type ?? 0, offset);
  writeString(buffer, offset + 1, 12, value.taxNumber);
  buffer.fill(0, offset + 13, offset + 14);
  writeDateTime(buffer, offset + 14, value.dateTime);
  buffer.fill(0, offset + 22, offset + 31);
  applyChecksum(buffer, offset, TAX_ID_RECORD_SIZE);
};

const parseVatRateChange = (buffer, offset) => {
  const result = {
    VatA: buffer.readUInt16LE(offset),
    VatB: buffer.readUInt16LE(offset + 2),
    VatC: buffer.readUInt16LE(offset + 4),
    VatD: buffer.readUInt16LE(offset + 6),
    VatE: buffer.readUInt16LE(offset + 8),
    VatF: buffer.readUInt16LE(offset + 10),
    VatG: buffer.readUInt16LE(offset + 12),
    VatH: buffer.readUInt16LE(offset + 14),
    VatAzbir: buffer.readUInt16LE(offset + 16),
    VatBzbir: buffer.readUInt16LE(offset + 18),
    VatCzbir: buffer.readUInt16LE(offset + 20),
    VatDzbir: buffer.readUInt16LE(offset + 22),
    VatEzbir: buffer.readUInt16LE(offset + 24),
    VatFzbir: buffer.readUInt16LE(offset + 26),
    VatGzbir: buffer.readUInt16LE(offset + 28),
    VatHzbir: buffer.readUInt16LE(offset + 30),
    dateTime: parseDateTime(buffer, offset + 32),
    NextZNumber: buffer.readUInt16LE(offset + 40),
    VATExcluded: buffer.readUInt8(offset + 42),
    DecPoint: buffer.readUInt8(offset + 43),
  };
  return result;
};

const writeVatRateChange = (buffer, offset, value) => {
  if (!value) return;
  buffer.writeUInt16LE(value.VatA ?? 0, offset);
  buffer.writeUInt16LE(value.VatB ?? 0, offset + 2);
  buffer.writeUInt16LE(value.VatC ?? 0, offset + 4);
  buffer.writeUInt16LE(value.VatD ?? 0, offset + 6);
  buffer.writeUInt16LE(value.VatE ?? 0, offset + 8);
  buffer.writeUInt16LE(value.VatF ?? 0, offset + 10);
  buffer.writeUInt16LE(value.VatG ?? 0, offset + 12);
  buffer.writeUInt16LE(value.VatH ?? 0, offset + 14);
  buffer.writeUInt16LE(value.VatAzbir ?? 0, offset + 16);
  buffer.writeUInt16LE(value.VatBzbir ?? 0, offset + 18);
  buffer.writeUInt16LE(value.VatCzbir ?? 0, offset + 20);
  buffer.writeUInt16LE(value.VatDzbir ?? 0, offset + 22);
  buffer.writeUInt16LE(value.VatEzbir ?? 0, offset + 24);
  buffer.writeUInt16LE(value.VatFzbir ?? 0, offset + 26);
  buffer.writeUInt16LE(value.VatGzbir ?? 0, offset + 28);
  buffer.writeUInt16LE(value.VatHzbir ?? 0, offset + 30);
  writeDateTime(buffer, offset + 32, value.dateTime);
  buffer.writeUInt16LE(value.NextZNumber ?? 0, offset + 40);
  buffer.writeUInt8(value.VATExcluded ?? 0, offset + 42);
  buffer.writeUInt8(value.DecPoint ?? 0, offset + 43);
  buffer.fill(0, offset + 44, offset + 47);
  applyChecksum(buffer, offset, VAT_RATE_RECORD_SIZE);
};

const parseRamResetRecord = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const NextZNumber = buffer.readUInt16LE(offset + 8);
  const Flag = buffer.readUInt8(offset + 10);
  return { dateTime, NextZNumber, Flag };
};

const writeRamResetRecord = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime);
  buffer.writeUInt16LE(value.NextZNumber ?? 0, offset + 8);
  buffer.writeUInt8(value.Flag ?? 0, offset + 10);
  buffer.fill(0, offset + 11, offset + 15);
  applyChecksum(buffer, offset, RAM_RESET_RECORD_SIZE);
};

const parseZReport = (buffer, offset) => {
  const result = {};
  let cursor = offset;

  result.ZNumber = buffer.readUInt16LE(cursor);
  cursor += 2;
  result.DateTime = parseDateTime(buffer, cursor);
  cursor += 8;
  result.FMNumChanges = buffer.readUInt8(cursor++);
  result.TaxNumChanges = buffer.readUInt8(cursor++);
  result.VatChanges = buffer.readUInt8(cursor++);
  result.RamResetsCount = buffer.readUInt8(cursor++);
  cursor += 2; // Filler[2]
  result.LastDocument = buffer.readUInt32LE(cursor);
  cursor += 4;
  result.LastFiscal = buffer.readUInt32LE(cursor);
  cursor += 4;
  result.LastStorno = buffer.readUInt32LE(cursor);
  cursor += 4;
  result.FiscalCount = buffer.readUInt16LE(cursor);
  cursor += 2;
  result.StornoCount = buffer.readUInt16LE(cursor);
  cursor += 2;

  const qwordFields = [
    "ObigVatA",
    "ObigVatB",
    "ObigVatC",
    "ObigVatD",
    "ObigVatE",
    "ObigVatF",
    "ObigVatG",
    "ObigVatH",
    "ObigVatAStorno",
    "ObigVatBStorno",
    "ObigVatCStorno",
    "ObigVatDStorno",
    "ObigVatEStorno",
    "ObigVatFStorno",
    "ObigVatGStorno",
    "ObigVatHStorno",
    "SumaVatA",
    "SumaVatB",
    "SumaVatC",
    "SumaVatD",
    "SumaVatE",
    "SumaVatF",
    "SumaVatG",
    "SumaVatH",
    "SumaVatAStorno",
    "SumaVatBStorno",
    "SumaVatCStorno",
    "SumaVatDStorno",
    "SumaVatEStorno",
    "SumaVatFStorno",
    "SumaVatGStorno",
    "SumaVatHStorno",
    "ZbirVatA",
    "ZbirVatB",
    "ZbirVatC",
    "ZbirVatD",
    "ZbirVatE",
    "ZbirVatF",
    "ZbirVatG",
    "ZbirVatH",
    "ZbirVatAStorno",
    "ZbirVatBStorno",
    "ZbirVatCStorno",
    "ZbirVatDStorno",
    "ZbirVatEStorno",
    "ZbirVatFStorno",
    "ZbirVatGStorno",
    "ZbirVatHStorno",
  ];

  for (const key of qwordFields) {
    result[key] = readUInt64LE(buffer, cursor);
    cursor += 8;
  }

  cursor += 15; // Filler2[15]
  result.CheckSum = buffer.readUInt8(cursor);

  return result;
};

const writeZReport = (buffer, offset, value) => {
  if (!value) return;
  let cursor = offset;

  buffer.writeUInt16LE(value.ZNumber ?? 0, cursor);
  cursor += 2;
  writeDateTime(buffer, cursor, value.DateTime);
  cursor += 8;
  buffer.writeUInt8(value.FMNumChanges ?? 0, cursor++);
  buffer.writeUInt8(value.TaxNumChanges ?? 0, cursor++);
  buffer.writeUInt8(value.VatChanges ?? 0, cursor++);
  buffer.writeUInt8(value.RamResetsCount ?? 0, cursor++);
  buffer.fill(0, cursor, cursor + 2); // Filler[2]
  cursor += 2;
  buffer.writeUInt32LE(value.LastDocument ?? 0, cursor);
  cursor += 4;
  buffer.writeUInt32LE(value.LastFiscal ?? 0, cursor);
  cursor += 4;
  buffer.writeUInt32LE(value.LastStorno ?? 0, cursor);
  cursor += 4;
  buffer.writeUInt16LE(value.FiscalCount ?? 0, cursor);
  cursor += 2;
  buffer.writeUInt16LE(value.StornoCount ?? 0, cursor);
  cursor += 2;

  const qwordFields = [
    "ObigVatA",
    "ObigVatB",
    "ObigVatC",
    "ObigVatD",
    "ObigVatE",
    "ObigVatF",
    "ObigVatG",
    "ObigVatH",
    "ObigVatAStorno",
    "ObigVatBStorno",
    "ObigVatCStorno",
    "ObigVatDStorno",
    "ObigVatEStorno",
    "ObigVatFStorno",
    "ObigVatGStorno",
    "ObigVatHStorno",
    "SumaVatA",
    "SumaVatB",
    "SumaVatC",
    "SumaVatD",
    "SumaVatE",
    "SumaVatF",
    "SumaVatG",
    "SumaVatH",
    "SumaVatAStorno",
    "SumaVatBStorno",
    "SumaVatCStorno",
    "SumaVatDStorno",
    "SumaVatEStorno",
    "SumaVatFStorno",
    "SumaVatGStorno",
    "SumaVatHStorno",
    "ZbirVatA",
    "ZbirVatB",
    "ZbirVatC",
    "ZbirVatD",
    "ZbirVatE",
    "ZbirVatF",
    "ZbirVatG",
    "ZbirVatH",
    "ZbirVatAStorno",
    "ZbirVatBStorno",
    "ZbirVatCStorno",
    "ZbirVatDStorno",
    "ZbirVatEStorno",
    "ZbirVatFStorno",
    "ZbirVatGStorno",
    "ZbirVatHStorno",
  ];

  for (const key of qwordFields) {
    writeUInt64LE(buffer, cursor, value[key]);
    cursor += 8;
  }

  buffer.fill(0, cursor, cursor + 15); // Filler2[15]
  cursor += 15;
  applyChecksum(buffer, offset, Z_REPORT_SIZE);
};

const parseEJOpen = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const lastRecOnOpening = buffer.readUInt32LE(offset + 8);
  const lastZOnOpening = buffer.readUInt16LE(offset + 12);
  return { dateTime, lastRecOnOpening, lastZOnOpening };
};

const writeEJOpen = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime);
  buffer.writeUInt32LE(value.lastRecOnOpening ?? 0, offset + 8);
  buffer.writeUInt16LE(value.lastZOnOpening ?? 0, offset + 12);
  buffer.fill(0, offset + 14, offset + 23);
  applyChecksum(buffer, offset, EJ_RECORD_SIZE);
};

const parseEJClose = (buffer, offset) => {
  const dateTime = parseDateTime(buffer, offset);
  const lastRecOnClose = buffer.readUInt32LE(offset + 8);
  const lastZOnClose = buffer.readUInt16LE(offset + 12);
  const lostOrBroken = buffer.readUInt8(offset + 14);
  return { dateTime, lastRecOnClose, lastZOnClose, lostOrBroken };
};

const writeEJClose = (buffer, offset, value) => {
  if (!value) return;
  writeDateTime(buffer, offset, value.dateTime);
  buffer.writeUInt32LE(value.lastRecOnClose ?? 0, offset + 8);
  buffer.writeUInt16LE(value.lastZOnClose ?? 0, offset + 12);
  buffer.writeUInt8(value.lostOrBroken ?? 0, offset + 14);
  buffer.fill(0, offset + 15, offset + 23);
  applyChecksum(buffer, offset, EJ_RECORD_SIZE);
};

const createDateResolver = (records, getDate, { oneBased = false } = {}) => {
  const lastIndex = records.length ? records.length - 1 : 0;
  const dated = records
    .map((rec, index) => {
      const iso = getDate(rec);
      const time = iso ? Date.parse(iso) : null;
      return { index, time };
    })
    .filter((item) => item.time !== null);

  return (zIso) => {
    if (!records.length) return 0;
    const zTime = zIso ? Date.parse(zIso) : NaN;
    if (Number.isNaN(zTime)) {
      return oneBased ? lastIndex + 1 : lastIndex;
    }
    const eligible = dated.filter((d) => d.time !== null && d.time <= zTime);
    if (!eligible.length) {
      return oneBased ? lastIndex + 1 : lastIndex;
    }
    const value = eligible[eligible.length - 1].index;
    return oneBased ? value + 1 : value;
  };
};

const parseDP25FiscalMemory = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }
  if (buffer.length < FILE_SIZE) {
    throw new Error("File too small to be a valid DP fiscal memory dump");
  }

  const warnings = [];
  const addWarning = (warning) => {
    warnings.push(warning);
    console.warn(warning.message);
  };

  const checkRecord = (recordType, index, recordOffset, length, iso) => {
    if (!verifyChecksum(buffer, recordOffset, length)) {
      addWarning({
        type: "checksum",
        recordType,
        index,
        offset: recordOffset,
        message: `Checksum mismatch in ${recordType}[${index}] at 0x${recordOffset.toString(
          16
        )}`,
      });
    }
    if (iso && isFutureIso(iso)) {
      addWarning({
        type: "future-date",
        recordType,
        index,
        offset: recordOffset,
        message: `Future date in ${recordType}[${index}] at 0x${recordOffset.toString(
          16
        )}: ${iso}`,
      });
    }
  };

  let offset = 0;

  offset += TEST_SPACE_SIZE;

  const serialRecord = parseSerialRecord(buffer, offset);
  if (!isRecordEmpty(buffer, offset, SERIAL_RECORD_SIZE)) {
    checkRecord(
      "SerialRecord",
      0,
      offset,
      SERIAL_RECORD_SIZE,
      serialRecord?.dateTime?.iso
    );
  }
  offset += SERIAL_RECORD_SIZE;

  const fiscalModeStart = parseFiscalModeStart(buffer, offset);
  if (!isRecordEmpty(buffer, offset, FISCAL_MODE_START_SIZE)) {
    checkRecord(
      "FiscalModeStart",
      0,
      offset,
      FISCAL_MODE_START_SIZE,
      fiscalModeStart?.dateTime?.iso
    );
  }
  offset += FISCAL_MODE_START_SIZE;

  const fmNumbers = [];
  for (let i = 0; i < FM_NUMBER_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, FM_NUMBER_RECORD_SIZE)) {
      const record = parseFMNumberRecord(buffer, offset);
      fmNumbers.push(record);
      checkRecord(
        "FMNumberRecord",
        i,
        offset,
        FM_NUMBER_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += FM_NUMBER_RECORD_SIZE;
  }

  const taxNumbers = [];
  for (let i = 0; i < TAX_ID_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, TAX_ID_RECORD_SIZE)) {
      const record = parseTaxIdRecord(buffer, offset);
      taxNumbers.push(record);
      checkRecord(
        "TaxIDNum",
        i,
        offset,
        TAX_ID_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += TAX_ID_RECORD_SIZE;
  }

  const vatRateChanges = [];
  for (let i = 0; i < VAT_RATE_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, VAT_RATE_RECORD_SIZE)) {
      const record = parseVatRateChange(buffer, offset);
      vatRateChanges.push(record);
      checkRecord(
        "VatRateChanges",
        i,
        offset,
        VAT_RATE_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += VAT_RATE_RECORD_SIZE;
  }

  const ramResets = [];
  for (let i = 0; i < RAM_RESET_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, RAM_RESET_RECORD_SIZE)) {
      const record = parseRamResetRecord(buffer, offset);
      ramResets.push(record);
      checkRecord(
        "RAMResetRecord",
        i,
        offset,
        RAM_RESET_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += RAM_RESET_RECORD_SIZE;
  }

  const zReports = [];
  for (let i = 0; i < Z_REPORT_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, Z_REPORT_SIZE)) {
      const record = parseZReport(buffer, offset);
      zReports.push(record);
      checkRecord(
        "ZReport",
        i,
        offset,
        Z_REPORT_SIZE,
        record?.DateTime?.iso
      );
    }
    offset += Z_REPORT_SIZE;
  }

  const ejOpen = [];
  for (let i = 0; i < EJ_RECORD_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, EJ_RECORD_SIZE)) {
      const record = parseEJOpen(buffer, offset);
      ejOpen.push(record);
      checkRecord(
        "EJOpen",
        i,
        offset,
        EJ_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += EJ_RECORD_SIZE;
  }

  const ejClose = [];
  for (let i = 0; i < EJ_RECORD_COUNT; i++) {
    if (!isRecordEmpty(buffer, offset, EJ_RECORD_SIZE)) {
      const record = parseEJClose(buffer, offset);
      ejClose.push(record);
      checkRecord(
        "EJClose",
        i,
        offset,
        EJ_RECORD_SIZE,
        record?.dateTime?.iso
      );
    }
    offset += EJ_RECORD_SIZE;
  }

  offset += NOT_USED_SIZE;
  const cpuId = Array.from(buffer.subarray(offset, offset + CPU_ID_SIZE));

  return {
    serialRecord,
    fiscalModeStart,
    fmNumbers,
    taxNumbers,
    vatRateChanges,
    ramResets,
    zReports,
    ejOpen,
    ejClose,
    cpuId,
    warnings,
  };
};

const buildDP25FiscalMemory = (data) => {
  const buffer = Buffer.alloc(FILE_SIZE, 0xff);
  const fmResolver = createDateResolver(
    data?.fmNumbers ?? [],
    (rec) => rec?.dateTime?.iso,
    { oneBased: true }
  );
  const taxResolver = createDateResolver(
    data?.taxNumbers ?? [],
    (rec) => rec?.dateTime?.iso,
    { oneBased: true }
  );
  const vatResolver = createDateResolver(
    data?.vatRateChanges ?? [],
    (rec) => rec?.dateTime?.iso,
    { oneBased: true }
  );
  const resetResolver = createDateResolver(
    data?.ramResets ?? [],
    (rec) => rec?.dateTime?.iso,
    { oneBased: true }
  );
  let offset = 0;

  offset += TEST_SPACE_SIZE;

  writeSerialRecord(buffer, offset, data?.serialRecord);
  offset += SERIAL_RECORD_SIZE;

  writeFiscalModeStart(buffer, offset, data?.fiscalModeStart);
  offset += FISCAL_MODE_START_SIZE;

  for (let i = 0; i < FM_NUMBER_COUNT; i++) {
    writeFMNumberRecord(buffer, offset, data?.fmNumbers?.[i]);
    offset += FM_NUMBER_RECORD_SIZE;
  }

  for (let i = 0; i < TAX_ID_COUNT; i++) {
    writeTaxIdRecord(buffer, offset, data?.taxNumbers?.[i]);
    offset += TAX_ID_RECORD_SIZE;
  }

  for (let i = 0; i < VAT_RATE_COUNT; i++) {
    writeVatRateChange(buffer, offset, data?.vatRateChanges?.[i]);
    offset += VAT_RATE_RECORD_SIZE;
  }

  for (let i = 0; i < RAM_RESET_COUNT; i++) {
    writeRamResetRecord(buffer, offset, data?.ramResets?.[i]);
    offset += RAM_RESET_RECORD_SIZE;
  }

  for (let i = 0; i < Z_REPORT_COUNT; i++) {
    const zData = data?.zReports?.[i];
    if(!zData) {
       offset += Z_REPORT_SIZE;
       continue;
    }
    const zDateIso = zData?.DateTime?.iso;
    const computedValues = {
      FMNumChanges: fmResolver(zDateIso),
      TaxNumChanges: taxResolver(zDateIso),
      VatChanges: vatResolver(zDateIso),
      RamResetsCount: resetResolver(zDateIso),
    };
    writeZReport(buffer, offset, { ...zData, ...computedValues });
    offset += Z_REPORT_SIZE;
  }

  for (let i = 0; i < EJ_RECORD_COUNT; i++) {
    writeEJOpen(buffer, offset, data?.ejOpen?.[i]);
    offset += EJ_RECORD_SIZE;
  }

  for (let i = 0; i < EJ_RECORD_COUNT; i++) {
    writeEJClose(buffer, offset, data?.ejClose?.[i]);
    offset += EJ_RECORD_SIZE;
  }

  offset += NOT_USED_SIZE;

  // const cpuId = data?.cpuId ?? [];
  // for (let i = 0; i < CPU_ID_SIZE; i++) {
  //   buffer[offset + i] = cpuId[i] ?? 0xff;
  // }

  return buffer;
};

const loadDP25File = async (filePath) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  return parseDP25FiscalMemory(fileBuffer);
};

const saveDP25File = async (filePath, data) => {
  const buffer = buildDP25FiscalMemory(data);
  await fs.promises.writeFile(filePath, buffer);
  return { success: true };
};

module.exports = {
  buildDP25FiscalMemory,
  loadDP25File,
  parseDP25FiscalMemory,
  saveDP25File,
};
