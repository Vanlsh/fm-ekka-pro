const splitReport = (content) => {
  const data = content.split("Z - З В I Т");
  return data.slice(1);
};

const parseObig = (match) => {
  if (!match || match.length === 0) return 0;
  const value = match[match.length - 1];
  return Number(String(value).replace(/,/g, ""));
};

const parseDate = (dateTimeStr) => {
  const [dateStr, timeStr] = dateTimeStr.split(" ");
  const [day, month, year] = dateStr.split("-").map(Number);
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
};

const getReportInfo = (item) => {
  const regex = /(\d{7})\s+(\d{7})\s+(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/;
  const match = item.match(regex);

  if (match) {
    return {
      firstNumber: Number(match[1]),
      secondNumber: Number(match[2]),
      dateTime: parseDate(match[3]),
    };
  }

  const regexSecondNumber = /DI (\d+)/;
  const regex2 = /ЧЕК № (\d+)\s+(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/;

  const idMatch = item.match(regexSecondNumber);
  const firstNumberMatch = item.match(regex2);
  if (idMatch && firstNumberMatch) {
    return {
      firstNumber: Number(firstNumberMatch[1]),
      secondNumber: Number(idMatch[1]),
      dateTime: parseDate(firstNumberMatch[2]),
    };
  }

  throw new Error("Values not found");
};

const getSums = (item) => {
  if (!item) {
    return {
      count: 0,
      obigA: 0,
      obigB: 0,
      obigC: 0,
      obigD: 0,
      obigE: 0,
      obigM: 0,
      obigH: 0,
      vatA: 0,
      vatB: 0,
      vatC: 0,
      vatD: 0,
      vatE: 0,
      vatM: 0,
      vatH: 0,
    };
  }

  const regexObigA = /ОБIГ А\s+([\d,]+)/;
  const regexObigB = /ОБIГ Б\s+([\d,]+)/;
  const regexObigC = /ОБIГ В\s+([\d,]+)/;
  const regexObigD = /ОБIГ Г\s+([\d,]+)/;
  const regexObigE = /ОБIГ Д\s+([\d,]+)/;

  const obigA = parseObig(item.match(regexObigA));
  const obigB = parseObig(item.match(regexObigB));
  const obigC = parseObig(item.match(regexObigC));
  const obigD = parseObig(item.match(regexObigD));
  const obigE = parseObig(item.match(regexObigE));

  const obigTag = "(?:([*+]|Акциз)?[АБВГД]|[АБВГД]([*+]|Акциз)?)";
  const regexObigM = new RegExp(`ОБIГ М\\/${obigTag}\\s+([\\d,]+)`);
  const regexObigH = new RegExp(`ОБIГ Н\\/${obigTag}\\s+([\\d,]+)`);

  const obigM = parseObig(item.match(regexObigM));
  const obigH = parseObig(item.match(regexObigH));

  const regexVatObigA = /ПДВ А = \d{1,2},\d{2}%\s+([\d,]+)/;
  const regexVatObigB = /ПДВ Б = \d{1,2},\d{2}%\s+([\d,]+)/;
  const regexVatObigC = /ПДВ В = \d{1,2},\d{2}%\s+([\d,]+)/;
  const regexVatObigD = /ПДВ Г = \d{1,2},\d{2}%\s+([\d,]+)/;
  const regexVatObigE = /ПДВ Д = Неопод.\s+([\d,]+)/;

  const vatA = parseObig(item.match(regexVatObigA));
  const vatB = parseObig(item.match(regexVatObigB));
  const vatC = parseObig(item.match(regexVatObigC));
  const vatD = parseObig(item.match(regexVatObigD));
  const vatE = parseObig(item.match(regexVatObigE));

  const regexVatObigM = new RegExp(
    `М\\/${obigTag}\\s+=\\s+\\d{1,2},\\d{2}%\\s+([\\d,]+)`
  );
  const regexVatObigH = new RegExp(
    `Н\\/${obigTag}\\s+=\\s+\\d{1,2},\\d{2}%\\s+([\\d,]+)`
  );

  const vatM = parseObig(item.match(regexVatObigM));
  const vatH = parseObig(item.match(regexVatObigH));

  const regexCount = /ЧЕКIВ\s+(\d+)/;
  const countMatch = item.match(regexCount);
  const count = countMatch ? Number(countMatch[1]) : 0;

  return {
    count,
    obigA,
    obigB,
    obigC,
    obigD,
    obigE,
    obigM,
    obigH,
    vatA,
    vatB,
    vatC,
    vatD,
    vatE,
    vatM,
    vatH,
  };
};

const parseReport = (item) => {
  const [obig, storm] = item.split("ПОВЕРНЕНI");
  const paymentSum = getSums(obig);
  const returnedSum = getSums(storm);

  let infoReport = { firstNumber: 0, secondNumber: 0, dateTime: null };
  try {
    infoReport = getReportInfo(storm || obig || item);
  } catch {
    infoReport = { firstNumber: 0, secondNumber: 0, dateTime: null };
  }

  return { obig: paymentSum, storm: returnedSum, ...infoReport };
};

const toAmount = (value) => String(value ?? 0);

const toZReport = (report, index) => {
  const zNumber = index + 1;
  const dateTime = report.dateTime
    ? { raw: { time: 0, date: 0 }, iso: report.dateTime.toISOString() }
    : null;

  return {
    ZNumber: zNumber,
    DateTime: dateTime,
    LastDocument: report.firstNumber,
    FiscalCount: report.obig.count,
    StornoCount: report.storm.count,
    KSEFNum: 1,
    ObigVatA: toAmount(report.obig.obigA),
    ObigVatB: toAmount(report.obig.obigB),
    ObigVatC: toAmount(report.obig.obigC),
    ObigVatD: toAmount(report.obig.obigD),
    ObigVatE: toAmount(report.obig.obigE),
    ObigVatAStorno: toAmount(report.storm.obigA),
    ObigVatBStorno: toAmount(report.storm.obigB),
    ObigVatCStorno: toAmount(report.storm.obigC),
    ObigVatDStorno: toAmount(report.storm.obigD),
    ObigVatEStorno: toAmount(report.storm.obigE),
    SumaVatA: toAmount(report.obig.vatA),
    SumaVatB: toAmount(report.obig.vatB),
    SumaVatC: toAmount(report.obig.vatC),
    SumaVatD: toAmount(report.obig.vatD),
    SumaVatE: toAmount(report.obig.vatE),
    SumaVatAStorno: toAmount(report.storm.vatA),
    SumaVatBStorno: toAmount(report.storm.vatB),
    SumaVatCStorno: toAmount(report.storm.vatC),
    SumaVatDStorno: toAmount(report.storm.vatD),
    SumaVatEStorno: toAmount(report.storm.vatE),
    ZbirVatM: toAmount(report.obig.obigM),
    ZbirVatH: toAmount(report.obig.obigH),
    ZbirVatMStorno: toAmount(report.storm.obigM),
    ZbirVatHStorno: toAmount(report.storm.obigH),
    ZbirVatMTax: toAmount(report.obig.vatM),
    ZbirVatHTax: toAmount(report.obig.vatH),
    ZbirVatMTaxStorno: toAmount(report.storm.vatM),
    ZbirVatHTaxStorno: toAmount(report.storm.vatH),
    salesMode: 0,
  };
};

export const parseZReportsFromText = (content) => {
  const reports = splitReport(content).map(parseReport);
  return reports.map(toZReport);
};
