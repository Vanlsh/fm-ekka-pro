import { Button } from "@/components/ui/button";
import { useFiscalStore } from "@/store/fiscal";
import { toast } from "@/components/ui/sonner";

export const TestRecordsPage = () => {
  const { data, clearTestRecords, setMessage } = useFiscalStore();

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку завантажте файл фіскальної пам&apos;яті.
      </p>
    );
  }

  const handleClear = () => {
    clearTestRecords();
    setMessage("Тестові записи очищено.");
    toast.success("Тестові записи очищено");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Усі тестові записи можна очистити кнопкою нижче.
      </p>
      <Button variant="destructive" onClick={handleClear} className="w-full md:w-auto">
        Очистити всі тестові записи
      </Button>
    </div>
  );
};
