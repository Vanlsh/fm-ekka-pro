import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Barcode,
  ChevronDown,
  FlaskConical,
  Info,
  ListOrdered,
  Percent,
  Receipt,
  RefreshCcw,
  ScrollText,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFiscalStore } from "@/store/fiscal";

const navItems = [
  { to: "/meta", label: "Мета", icon: Info },
  { to: "/serial", label: "Серійний номер", icon: Barcode },
  { to: "/fm-numbers", label: "Номери ФМ", icon: ListOrdered },
  { to: "/vat-rates", label: "Ставки ПДВ", icon: Percent },
  { to: "/ram-resets", label: "Скидання RAM", icon: RefreshCcw },
  { to: "/tax-records", label: "Податкові записи", icon: ScrollText },
  { to: "/test-records", label: "Тестові записи", icon: FlaskConical },
  { to: "/z-reports", label: "Z-звіти", icon: Receipt },
];

const getSectionLabel = (path: string) =>
  navItems.find((item) => path.startsWith(item.to))?.label ?? "Додаток";

export function AppSidebar() {
  const { pathname } = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    | "idle"
    | "checking"
    | "downloading"
    | "downloaded"
    | "up-to-date"
    | "unavailable"
    | "error"
  >("idle");
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updatePercent, setUpdatePercent] = useState<number | null>(null);
  const { path, data, setData, setPath, setMessage } = useFiscalStore();

  const fileName = path ? (path.split(/[/\\]/).pop() ?? path) : null;
  const buttonLabel = path ? "Змінити файл" : "Завантажити файл";

  const getUpdatedSaveName = (currentPath: string | null) => {
    if (!currentPath) return "fiscal-memory_updated.bin";
    const lastSlash = Math.max(currentPath.lastIndexOf("/"), currentPath.lastIndexOf("\\"));
    const name = lastSlash >= 0 ? currentPath.slice(lastSlash + 1) : currentPath;
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
      const base = name.slice(0, dot);
      const ext = name.slice(dot);
      return `${base}_updated${ext}`;
    }
    return `${name}_updated`;
  };

  const handleLoadFromSidebar = async () => {
    if (
      data &&
      !window.confirm("Новий файл замінить поточні дані. Продовжити?")
    ) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const result = await window.api.openFiscalMemory();
      if (!result) {
        setMessage("Скасовано.");
        return;
      }
      setData(result.data);
      setPath(result.filePath);
      setMessage(`Завантажено: ${result.filePath}`);
    } catch (error: unknown) {
      const reason =
        error instanceof Error
          ? error.message
          : "Невідома помилка завантаження.";
      setMessage(`Не вдалося завантажити файл: ${reason}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) {
      setMessage("Немає даних для збереження.");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await window.api.saveFiscalMemoryAs(
        data,
        getUpdatedSaveName(path)
      );
      if (!result) {
        setMessage("Збереження скасовано.");
        return;
      }
      setPath(result.filePath);
      setMessage(`Збережено: ${result.filePath}`);
    } catch (error: unknown) {
      const reason =
        error instanceof Error ? error.message : "Невідома помилка збереження.";
      setMessage(`Не вдалося зберегти файл: ${reason}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    window.api.onUpdateDownloadProgress((info) => {
      setUpdateStatus("downloading");
      setUpdatePercent(Math.round(info.percent));
    });
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateStatus("checking");
    setUpdateMessage(null);
    setUpdatePercent(null);
    try {
      const result = await window.api.checkForUpdates();
      if (result.status === "downloaded") {
        setUpdateStatus("downloaded");
        setUpdateMessage(`Update ready: v${result.version}`);
        return;
      }
      if (result.status === "up-to-date") {
        setUpdateStatus("up-to-date");
        setUpdateMessage("You are on the latest version.");
        return;
      }
      if (result.status === "unavailable") {
        setUpdateStatus("unavailable");
        setUpdateMessage(result.message);
        return;
      }
      setUpdateStatus("error");
      setUpdateMessage(result.message);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unable to check for updates.";
      setUpdateStatus("error");
      setUpdateMessage(reason);
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.confirm("Install update and restart the app now?")) return;
    try {
      await window.api.installUpdate();
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Failed to install update.";
      setUpdateStatus("error");
      setUpdateMessage(reason);
    }
  };

  return (
    <Sidebar side="left" variant="inset">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-sm font-semibold uppercase text-primary">
            FM
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">
              Fiscal Memory
            </p>
            <p className="text-xs text-muted-foreground">
              {fileName ? `Файл: ${fileName}` : "Файл ще не завантажено"}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 pb-2">
          <Button
            type="button"
            onClick={handleLoadFromSidebar}
            disabled={isLoading}
            className="w-full justify-center"
          >
            {isLoading ? "Завантаження..." : buttonLabel}
          </Button>
          {data && (
            <div className="mt-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                variant="outline"
                className="w-full justify-center"
              >
                {isSaving ? "Збереження..." : "Зберегти файл"}
              </Button>
            </div>
          )}
        </div>
        <Collapsible defaultOpen className="group/collapsible px-3 py-2">
          <SidebarGroup className="rounded-xl border border-border bg-card p-2 shadow-sm">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Фіскальна пам'ять
                <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.to;

                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className="rounded-lg border border-transparent px-3  text-foreground data-[active=true]:border-primary/20 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                        >
                          <NavLink
                            to={item.to}
                            className="flex items-center gap-3 py-2"
                          >
                            <span className="grid size-5 place-items-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="size-2" />
                            </span>
                            <span className="truncate text-sm">
                              {item.label}
                            </span>
                            {active && (
                              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                Now
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Updates</p>
          <p className="mt-1 leading-relaxed">
            {updateMessage ?? "Check for app updates and install when ready."}
          </p>
          {updateStatus === "downloading" && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-border">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${updatePercent ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-[11px]">
                Downloading... {updatePercent ?? 0}%
              </p>
            </div>
          )}
          <div className="mt-2 flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCheckUpdates}
              disabled={updateStatus === "checking"}
              className="w-full justify-center"
            >
              {updateStatus === "checking"
                ? "Checking..."
                : "Check for updates"}
            </Button>
            {updateStatus === "downloaded" && (
              <Button
                type="button"
                size="sm"
                onClick={handleInstallUpdate}
                className="w-full justify-center"
              >
                Install update
              </Button>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export const MainLayout = () => {
  const { pathname } = useLocation();
  const sectionLabel = getSectionLabel(pathname);

  return (
    <SidebarProvider defaultValue="open">
      <AppSidebar />
      <SidebarInset className="h-[calc(100vh-1rem)] pb-1">
        <header className="sticky top-2 flex h-16 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-muted-foreground">Розділ:</span>
            <span className="text-foreground">{sectionLabel}</span>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
