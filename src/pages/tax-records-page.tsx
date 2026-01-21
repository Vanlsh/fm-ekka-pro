import { useEffect } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
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
import { useFiscalStore } from "@/store/fiscal";
import { toast } from "@/components/ui/sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

const taxEntrySchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
  type: z.number(),
  lastZReport: z.number(),
  taxNumber: z.string().min(1, "Податковий номер обов'язковий"),
});

const taxSchema = z.object({
  taxRecords: z
    .array(taxEntrySchema)
    .min(1, "Потрібен хоча б один запис")
    .max(8, "Не більше 8 записів"),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export const TaxRecordsPage = () => {
  const { data, setTaxRecords, setMessage } = useFiscalStore();

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      taxRecords:
        data?.taxRecords.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          type: item.type,
          lastZReport: item.lastZReport,
          taxNumber: item.taxNumber,
        })) ?? [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "taxRecords",
  });
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 250,
    easing: "ease-in-out",
  });

  useEffect(() => {
    if (data?.taxRecords) {
      form.reset({
        taxRecords: data.taxRecords.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          type: item.type,
          lastZReport: item.lastZReport,
          taxNumber: item.taxNumber,
        })),
      });
    }
  }, [data?.taxRecords, form]);

  const onSubmit: SubmitHandler<TaxFormValues> = (values) => {
    if (!data) return;
    const next = values.taxRecords.map((item, idx) => {
      const raw = data.taxRecords[idx]?.dateTime?.raw ?? { time: 0, date: 0 };
      return {
        dateTime: { raw, iso: item.iso },
        type: item.type,
        lastZReport: item.lastZReport,
        taxNumber: item.taxNumber,
      };
    });
    setTaxRecords(next);
    setMessage("Податкові записи оновлено.");
    toast.success("Податкові записи оновлено");
  };

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Спочатку завантажте файл фіскальної пам&apos;яті.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Податкові записи</p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ iso: "", type: 0, lastZReport: 0, taxNumber: "" })
            }
            disabled={fields.length >= 8}
          >
            Додати
          </Button>
        </div>

        <div className="space-y-3" ref={listRef}>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-2 rounded-lg border border-border p-2"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <p className="text-sm font-semibold">#{index + 1}</p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => move(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  aria-label="Перемістити вгору"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    move(index, Math.min(fields.length - 1, index + 1))
                  }
                  disabled={index === fields.length - 1}
                  aria-label="Перемістити вниз"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="ml-auto"
                >
                  Видалити
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`taxRecords.${index}.iso`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISO datetime</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`taxRecords.${index}.taxNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Податковий номер</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`taxRecords.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`taxRecords.${index}.lastZReport`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Останній Z-звіт</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                form.reset({
                  taxRecords:
                    data.taxRecords.map((item) => ({
                      iso: item.dateTime?.iso ?? "",
                      type: item.type,
                      lastZReport: item.lastZReport,
                      taxNumber: item.taxNumber,
                    })) ?? [],
                })
              }
            >
              Скасувати
            </Button>
            <Button type="submit" className="w-full md:w-auto">
              Зберегти зміни
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
