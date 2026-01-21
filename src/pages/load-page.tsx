import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useFiscalStore } from "@/store/fiscal";

export const LoadPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setData, setPath, message, setMessage, path } = useFiscalStore();

  const fileName = path ? (path.split(/[/\\]/).pop() ?? path) : null;
  const buttonLabel = path ? "Змінити файл" : "Завантажити файл";

  const handleLoadFiscalMemory = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await window.api.openFiscalMemory();
      if (!result) {
        setMessage("Canceled.");
        return;
      }
      console.log("Fiscal memory data:", result.data);
      setData(result.data);
      setPath(result.filePath);
      setMessage(`Loaded: ${result.filePath}`);
    } catch (error: unknown) {
      console.error(error);
      const reason =
        error instanceof Error ? error.message : "Unknown load error.";
      setMessage(`Failed to load file: ${reason}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md space-y-3">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-lg">Файл фіскальної пам&apos;яті</CardTitle>
            <CardDescription>
              {fileName
                ? `Завантажено: ${fileName}`
                : "Файл ще не завантажено."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fileName && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                Готово
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadFiscalMemory}
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Завантаження..." : buttonLabel}
            </Button>
          </CardContent>
        </Card>
        {message && (
          <p className="text-xs text-muted-foreground text-center">{message}</p>
        )}
      </div>
    </div>
  );
};
