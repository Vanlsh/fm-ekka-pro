import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useFiscalStore } from "@/store/fiscal";

const metaSchema = z.object({
  flag: z
    .number()
    .refine((val) => val === 0 || val === 255, "Значення має бути 0 або 255"),
  idString: z.string().length(15, "Рядок має містити рівно 15 символів"),
});

type MetaFormValues = z.infer<typeof metaSchema>;

export const MetaPage = () => {
  const { data, setMeta, setMessage } = useFiscalStore();
  const [ksefNumbers, setKsefNumbers] = useState<number[]>(
    data?.meta.ksefNumbers ?? []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const form = useForm<MetaFormValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      flag: data?.meta.flag ?? 0,
      idString: data?.meta.idString ?? "",
    },
  });

  useEffect(() => {
    if (data?.meta) {
      form.reset({
        flag: data.meta.flag,
        idString: data.meta.idString,
      });
      setKsefNumbers(data.meta.ksefNumbers);
      setHasSaved(false);
    }
  }, [data?.meta, form]);

  useEffect(() => {
    const subscription = form.watch(() => setHasSaved(false));
    return () => subscription.unsubscribe();
  }, [form]);

  const zeroCount = useMemo(
    () => ksefNumbers.filter((v) => v === 0).length,
    [ksefNumbers]
  );
  const totalCount = ksefNumbers.length;

  const handleKsefPlus = () => {
    setKsefNumbers((prev) => {
      const next = [...prev];
      const idx = next.findIndex((v) => v === 255);
      if (idx !== -1) {
        next[idx] = 0;
        return next;
      }
      next.push(0);
      return next;
    });
  };

  const handleKsefMinus = () => {
    setKsefNumbers((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i] === 0) {
          next[i] = 255;
          break;
        }
      }
      return next;
    });
  };

  const onSubmit: SubmitHandler<MetaFormValues> = (values) => {
    if (!data) return;
    const cleanKsef = ksefNumbers.map((v) => (v === 0 ? 0 : 255));
    setIsSaving(true);
    setMeta({
      flag: values.flag,
      idString: values.idString,
      ksefNumbers: cleanKsef,
    });
    setMessage("Метадані оновлено.");
    toast.success("Метадані оновлено");
    setHasSaved(true);
    setIsSaving(false);
  };

  return (
    <>
      {!data ? (
        <p className="text-sm text-muted-foreground">
          Спочатку завантажте файл фіскальної пам&apos;яті.
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <p className="text-base font-semibold">Редагувати метадані</p>

            <FormField
              control={form.control}
              name="flag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Прапор (0 — блок, 255 — дозволено)</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Обрати значення" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="255">255 — ОК</SelectItem>
                      <SelectItem value="0">0 — Блок</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="idString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ідентифікатор (16 символів)</FormLabel>
                  <FormControl>
                    <Input maxLength={16} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Кількість КСЕФ</p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    Використано:{" "}
                    <span className="font-semibold">{zeroCount}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Усього доступно: {totalCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleKsefMinus}
                  disabled={zeroCount === 0}
                >
                  −
                </Button>
                <Button type="button" onClick={handleKsefPlus}>
                  +
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto text-xs"
                  onClick={() => setKsefNumbers(data.meta.ksefNumbers)}
                >
                  Скинути
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={isSaving || hasSaved}
              >
                Зберегти зміни
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
};
