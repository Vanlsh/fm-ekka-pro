import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFiscalStore } from "@/store/fiscal";
import { toast } from "@/components/ui/sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ZReport } from "@/lib/fm-types";
import { zReportFieldLabels } from "@/lib/z-report-labels";
import { ChevronDown } from "lucide-react";

export const ZReportsPage = () => {
  const { data, setZReports } = useFiscalStore();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [zNumberFilter, setZNumberFilter] = useState("");
  const [zRangeStart, setZRangeStart] = useState("");
  const [zRangeEnd, setZRangeEnd] = useState("");
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<number, boolean>>({});

  const reports = data?.zReports ?? [];
  const itemEstimate = 260;
  const overscan = 10;
  const itemGap = 12;

  const createEmptyZReport = (zNumber: number): ZReport => ({
    ZNumber: zNumber,
    DateTime: null,
    FMNumChanges: 0,
    TaxNumChanges: 0,
    VatChanges: 0,
    RamResetsCount: 0,
    LastDocument: 0,
    LastFiscal: 0,
    LastStorno: 0,
    FiscalCount: 0,
    StornoCount: 0,
    ObigVatA: "0",
    ObigVatB: "0",
    ObigVatC: "0",
    ObigVatD: "0",
    ObigVatE: "0",
    ObigVatF: "0",
    ObigVatG: "0",
    ObigVatH: "0",
    ObigVatAStorno: "0",
    ObigVatBStorno: "0",
    ObigVatCStorno: "0",
    ObigVatDStorno: "0",
    ObigVatEStorno: "0",
    ObigVatFStorno: "0",
    ObigVatGStorno: "0",
    ObigVatHStorno: "0",
    SumaVatA: "0",
    SumaVatB: "0",
    SumaVatC: "0",
    SumaVatD: "0",
    SumaVatE: "0",
    SumaVatF: "0",
    SumaVatG: "0",
    SumaVatH: "0",
    SumaVatAStorno: "0",
    SumaVatBStorno: "0",
    SumaVatCStorno: "0",
    SumaVatDStorno: "0",
    SumaVatEStorno: "0",
    SumaVatFStorno: "0",
    SumaVatGStorno: "0",
    SumaVatHStorno: "0",
    ZbirVatA: "0",
    ZbirVatB: "0",
    ZbirVatC: "0",
    ZbirVatD: "0",
    ZbirVatE: "0",
    ZbirVatF: "0",
    ZbirVatG: "0",
    ZbirVatH: "0",
    ZbirVatAStorno: "0",
    ZbirVatBStorno: "0",
    ZbirVatCStorno: "0",
    ZbirVatDStorno: "0",
    ZbirVatEStorno: "0",
    ZbirVatFStorno: "0",
    ZbirVatGStorno: "0",
    ZbirVatHStorno: "0",
  });

  const handleAddReport = () => {
    if (!data) return;
    const nextNumber = reports.length + 1;
    pendingScrollIndexRef.current = reports.length;
    setZReports((prev) => [...prev, createEmptyZReport(nextNumber)]);
  };

  const normalizeReports = (items: ZReport[]) =>
    items.map((item, idx) => {
      const nextNumber = idx + 1;
      return {
        ...createEmptyZReport(nextNumber),
        ...item,
        ZNumber: nextNumber,
      };
    });

  const handleImportReports = async (mode: "add" | "overwrite") => {
    if (!data) return;
    setImportDialogOpen(false);
    const result = await window.api.importZReports();
    if (!result) return;
    const nextReports = normalizeReports(result.reports);
    if (mode === "overwrite") {
      setZReports(() => nextReports);
      toast.success("Z-звіти імпортовано (перезаписано).");
      return;
    }
    const combined = normalizeReports([...reports, ...nextReports]);
    setZReports(() => combined);
    toast.success("Z-звіти додано.");
  };

  const filteredReports = useMemo(
    () =>
      reports
        .map((report, index) => ({ report, index }))
        .filter(({ report }) => {
          // z-number exact filter
          if (zNumberFilter.trim()) {
            const parsedZ = Number(zNumberFilter.trim());
            if (!Number.isNaN(parsedZ) && report.ZNumber !== parsedZ) {
              return false;
            }
          }

          // date range filter
          if (dateFrom || dateTo) {
            const iso = report.DateTime?.iso ?? "";
            if (!iso) return false;
            const time = Date.parse(iso);
            if (Number.isNaN(time)) return false;
            if (dateFrom) {
              const fromMs = Date.parse(dateFrom);
              if (!Number.isNaN(fromMs) && time < fromMs) return false;
            }
            if (dateTo) {
              const toMs = Date.parse(dateTo);
              if (!Number.isNaN(toMs) && time > toMs) return false;
            }
          }

          return true;
        }),
    [reports, dateFrom, dateTo, zNumberFilter],
  );

  const getItemKey = useCallback(
    (virtualIndex: number) => {
      const row = filteredReports[virtualIndex];
      if (!row) return virtualIndex;
      return `${row.report.ZNumber}-${row.index}`;
    },
    [filteredReports],
  );

  const measureRow = useCallback(
    (el: Element | null | undefined) =>
      el?.getBoundingClientRect().height ?? itemEstimate,
    [itemEstimate],
  );

  const rowVirtualizer = useVirtualizer({
    count: filteredReports.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => itemEstimate,
    overscan,
    enabled: filteredReports.length > 0,
    gap: itemGap,
    getItemKey,
    measureElement: measureRow,
  });

  useEffect(() => {
    if (pendingScrollIndexRef.current === null) return;
    const index = pendingScrollIndexRef.current;
    pendingScrollIndexRef.current = null;
    if (index < filteredReports.length) {
      rowVirtualizer.scrollToIndex(index, { align: "center" });
    }
  }, [filteredReports.length, rowVirtualizer]);

  const fieldLabels = zReportFieldLabels;

  const renderField = (label: string, value: string | number | undefined) => (
    <div className="flex items-center justify-between rounded border border-border/40 bg-muted/40 px-2 py-1 text-[11px] leading-tight text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <span className="ml-2 text-right text-foreground/90">{value ?? "—"}</span>
    </div>
  );

  const handleDelete = (originalIndex: number) => {
    setZReports((prev) =>
      prev
        .filter((_, idx) => idx !== originalIndex)
        .map((item, idx) => ({
          ...item,
          ZNumber: idx + 1,
        })),
    );
  };

  const handleDeleteRange = () => {
    const start = Number(zRangeStart);
    const end = Number(zRangeEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    const [min, max] = start <= end ? [start, end] : [end, start];
    setZReports((prev) =>
      prev
        .filter((item) => item.ZNumber < min || item.ZNumber > max)
        .map((item, idx) => ({
          ...item,
          ZNumber: idx + 1,
        })),
    );
  };

  const renderReport = (
    report: ZReport,
    key: string,
    start: number,
    virtualIndex: number,
    originalIndex: number,
  ) => {
    const isOpen = !!openDetails[report.ZNumber];
    return (
      <div
        key={key}
        ref={rowVirtualizer.measureElement}
        data-index={virtualIndex}
        className="absolute left-0 right-0 rounded-lg border border-border bg-card/60 p-3 text-sm"
        style={{
          transform: `translateY(${start}px)`,
          width: "100%",
        }}
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Z #{report.ZNumber}
          </span>
          <span>{report.DateTime?.iso ?? "—"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 w-full col">
          <Collapsible
            open={isOpen}
            className="w-full"
            onOpenChange={(nextOpen) =>
              setOpenDetails((prev) => ({
                ...prev,
                [report.ZNumber]: nextOpen,
              }))
            }
          >
            <div className="flex justify-between gap-2 w-full">
              <div className="flex gap-2 ">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/z-report/${report.ZNumber}/edit`)}
                  className="text-[11px]"
                >
                  Редагувати
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(originalIndex)}
                  className="text-[11px]"
                >
                  Видалити
                </Button>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[11px]">
                  Деталі
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-3 space-y-2 overflow-hidden text-[12px] transition-[height] duration-200 ease-out data-[state=closed]:h-0 data-[state=open]:h-[var(--radix-collapsible-content-height)]">
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                {renderField(fieldLabels.FMNumChanges, report.FMNumChanges)}
                {renderField(fieldLabels.TaxNumChanges, report.TaxNumChanges)}
                {renderField(fieldLabels.VatChanges, report.VatChanges)}
                {renderField(fieldLabels.RamResetsCount, report.RamResetsCount)}
                {renderField(fieldLabels.FiscalCount, report.FiscalCount)}
                {renderField(fieldLabels.StornoCount, report.StornoCount)}
                {renderField(fieldLabels.LastDocument, report.LastDocument)}
                {renderField(fieldLabels.LastFiscal, report.LastFiscal)}
                {renderField(fieldLabels.LastStorno, report.LastStorno)}
                {renderField(fieldLabels.DateTime, report.DateTime?.iso ?? "—")}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.ObigVatA, report.ObigVatA)}
                {renderField(fieldLabels.ObigVatB, report.ObigVatB)}
                {renderField(fieldLabels.ObigVatC, report.ObigVatC)}
                {renderField(fieldLabels.ObigVatD, report.ObigVatD)}
                {renderField(fieldLabels.ObigVatE, report.ObigVatE)}
                {renderField(fieldLabels.ObigVatF, report.ObigVatF)}
                {renderField(fieldLabels.ObigVatG, report.ObigVatG)}
                {renderField(fieldLabels.ObigVatH, report.ObigVatH)}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.ObigVatAStorno, report.ObigVatAStorno)}
                {renderField(fieldLabels.ObigVatBStorno, report.ObigVatBStorno)}
                {renderField(fieldLabels.ObigVatCStorno, report.ObigVatCStorno)}
                {renderField(fieldLabels.ObigVatDStorno, report.ObigVatDStorno)}
                {renderField(fieldLabels.ObigVatEStorno, report.ObigVatEStorno)}
                {renderField(fieldLabels.ObigVatFStorno, report.ObigVatFStorno)}
                {renderField(fieldLabels.ObigVatGStorno, report.ObigVatGStorno)}
                {renderField(fieldLabels.ObigVatHStorno, report.ObigVatHStorno)}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.SumaVatA, report.SumaVatA)}
                {renderField(fieldLabels.SumaVatB, report.SumaVatB)}
                {renderField(fieldLabels.SumaVatC, report.SumaVatC)}
                {renderField(fieldLabels.SumaVatD, report.SumaVatD)}
                {renderField(fieldLabels.SumaVatE, report.SumaVatE)}
                {renderField(fieldLabels.SumaVatF, report.SumaVatF)}
                {renderField(fieldLabels.SumaVatG, report.SumaVatG)}
                {renderField(fieldLabels.SumaVatH, report.SumaVatH)}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.SumaVatAStorno, report.SumaVatAStorno)}
                {renderField(fieldLabels.SumaVatBStorno, report.SumaVatBStorno)}
                {renderField(fieldLabels.SumaVatCStorno, report.SumaVatCStorno)}
                {renderField(fieldLabels.SumaVatDStorno, report.SumaVatDStorno)}
                {renderField(fieldLabels.SumaVatEStorno, report.SumaVatEStorno)}
                {renderField(fieldLabels.SumaVatFStorno, report.SumaVatFStorno)}
                {renderField(fieldLabels.SumaVatGStorno, report.SumaVatGStorno)}
                {renderField(fieldLabels.SumaVatHStorno, report.SumaVatHStorno)}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.ZbirVatA, report.ZbirVatA)}
                {renderField(fieldLabels.ZbirVatB, report.ZbirVatB)}
                {renderField(fieldLabels.ZbirVatC, report.ZbirVatC)}
                {renderField(fieldLabels.ZbirVatD, report.ZbirVatD)}
                {renderField(fieldLabels.ZbirVatE, report.ZbirVatE)}
                {renderField(fieldLabels.ZbirVatF, report.ZbirVatF)}
                {renderField(fieldLabels.ZbirVatG, report.ZbirVatG)}
                {renderField(fieldLabels.ZbirVatH, report.ZbirVatH)}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {renderField(fieldLabels.ZbirVatAStorno, report.ZbirVatAStorno)}
                {renderField(fieldLabels.ZbirVatBStorno, report.ZbirVatBStorno)}
                {renderField(fieldLabels.ZbirVatCStorno, report.ZbirVatCStorno)}
                {renderField(fieldLabels.ZbirVatDStorno, report.ZbirVatDStorno)}
                {renderField(fieldLabels.ZbirVatEStorno, report.ZbirVatEStorno)}
                {renderField(fieldLabels.ZbirVatFStorno, report.ZbirVatFStorno)}
                {renderField(fieldLabels.ZbirVatGStorno, report.ZbirVatGStorno)}
                {renderField(fieldLabels.ZbirVatHStorno, report.ZbirVatHStorno)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Z-звіти</h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Всього: {filteredReports.length} / {reports.length}
            </p>
            {/* <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImportDialogOpen(true);
              }}
            >
              Імпорт
            </Button> */}
            <Button size="sm" onClick={handleAddReport}>
              Додати
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={zRangeStart}
              onChange={(e) => setZRangeStart(e.target.value)}
              placeholder="Z від"
              className="h-8 w-24 text-xs"
            />
            <Input
              type="number"
              value={zRangeEnd}
              onChange={(e) => setZRangeEnd(e.target.value)}
              placeholder="Z до"
              className="h-8 w-24 text-xs"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteRange}
              className="h-8 text-[11px]"
            >
              Видалити діапазон
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={zNumberFilter}
              onChange={(e) => setZNumberFilter(e.target.value)}
              placeholder="Z номер"
              className="h-8 w-28 text-xs"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
        </div>
      </div>

      {!data ? (
        <p className="text-sm text-muted-foreground">
          Спочатку завантажте файл фіскальної пам&apos;яті.
        </p>
      ) : (
        <>
          <AlertDialog
            open={isImportDialogOpen}
            onOpenChange={setImportDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Імпорт Z-звітів</AlertDialogTitle>
                <AlertDialogDescription>
                  Додати імпортовані звіти до поточних чи перезаписати?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleImportReports("add")}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Додати
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleImportReports("overwrite")}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Перезаписати
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div
            ref={listRef}
            className="relative h-[70vh] overflow-auto rounded-lg bg-muted/30"
          >
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((item) => {
                const row = filteredReports[item.index];
                if (!row) return null;
                return renderReport(
                  row.report,
                  String(item.key),
                  item.start,
                  item.index,
                  row.index,
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
