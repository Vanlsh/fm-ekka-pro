import { useMemo } from "react";
import { useFiscalStore } from "@/store/fiscal";

const typeLabels: Record<string, string> = {
  checksum: "Невірна контрольна сума",
  "future-date": "Дата в майбутньому",
};

const recordLabels: Record<string, string> = {
  SerialRecord: "Серійний запис",
  FiscalModeStart: "Фіскальний режим",
  FMNumberRecord: "Номер ФМ",
  TaxIDNum: "Податковий номер",
  VatRateChanges: "Ставки ПДВ",
  RAMResetRecord: "Скидання RAM",
  ZReport: "Z-звіт",
  EJOpen: "Відкриття ЕЖ",
  EJClose: "Закриття ЕЖ",
};

export const LogsPage = () => {
  const { data } = useFiscalStore();

  const warnings = useMemo(() => data?.warnings ?? [], [data?.warnings]);

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку завантажте файл фіскальної пам&apos;яті.
      </p>
    );
  }

  if (!warnings.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Логів не знайдено. Перевірки пройдені без помилок.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Логи перевірки</h2>
        <p className="text-xs text-muted-foreground">
          Знайдено записів: {warnings.length}
        </p>
      </div>

      <div className="space-y-2">
        {warnings.map((item, index) => {
          const recordLabel = recordLabels[item.recordType] ?? item.recordType;
          const typeLabel = typeLabels[item.type] ?? item.type;
          const offsetHex = `0x${item.offset.toString(16)}`;
          return (
            <div
              key={`${item.recordType}-${item.index}-${index}`}
              className="rounded-lg border border-border bg-card/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{typeLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {recordLabel} #{item.index + 1} · {offsetHex}
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
