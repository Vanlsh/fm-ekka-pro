import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { LoadPage } from "./pages/load-page";
import { FiscalModeStartPage } from "./pages/fiscal-mode-start-page";
import { SerialPage } from "./pages/serial-page";
import { FMNumbersPage } from "./pages/fm-numbers-page";
import { VatRatesPage } from "./pages/vat-rates-page";
import { RamResetsPage } from "./pages/ram-resets-page";
import { TaxRecordsPage } from "./pages/tax-records-page";
import { TestRecordsPage } from "./pages/test-records-page";
import { ZReportsPage } from "./pages/z-reports-page";
import { ZReportEditPage } from "./pages/z-report-edit-page";
import { LogsPage } from "./pages/logs-page";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/load" replace />} />
          <Route path="load" element={<LoadPage />} />
          <Route path="fiscal-mode-start" element={<FiscalModeStartPage />} />
          <Route path="serial" element={<SerialPage />} />
          <Route path="fm-numbers" element={<FMNumbersPage />} />
          <Route path="vat-rates" element={<VatRatesPage />} />
          <Route path="ram-resets" element={<RamResetsPage />} />
          <Route path="tax-records" element={<TaxRecordsPage />} />
          <Route path="test-records" element={<TestRecordsPage />} />
          <Route path="z-reports" element={<ZReportsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="z-report/:id/edit" element={<ZReportEditPage />} />
          <Route path="*" element={<Navigate to="/load" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </HashRouter>
  );
}

export default App;
