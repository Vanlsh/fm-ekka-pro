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
import { buildRawFromIso } from "@/lib/fm-datetime";

const fmEntrySchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
  fmNumber: z.string().min(1, "Номер обов'язковий"),
});

const fmNumbersSchema = z.object({
  fmNumbers: z
    .array(fmEntrySchema)
    .max(8, "Не більше 8 записів")
    .min(1, "Потрібен хоча б один запис"),
});

type FMFormValues = z.infer<typeof fmNumbersSchema>;

export const FMNumbersPage = () => {
  const { data, setFMNumbers, setMessage } = useFiscalStore();

  const form = useForm<FMFormValues>({
    resolver: zodResolver(fmNumbersSchema),
    defaultValues: {
      fmNumbers:
        data?.fmNumbers.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          fmNumber: item.fmNumber,
        })) ?? [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "fmNumbers",
  });
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 250,
    easing: "ease-in-out",
  });

  useEffect(() => {
    if (data?.fmNumbers) {
      form.reset({
        fmNumbers: data.fmNumbers.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          fmNumber: item.fmNumber,
        })),
      });
    }
  }, [data?.fmNumbers, form]);

  const onSubmit: SubmitHandler<FMFormValues> = (values) => {
    if (!data) return;
    const next = [];
    for (let idx = 0; idx < values.fmNumbers.length; idx += 1) {
      const item = values.fmNumbers[idx];
      const raw =
        buildRawFromIso(item.iso) ?? data.fmNumbers[idx]?.dateTime?.raw;
      if (!raw) return;
      next.push({
        dateTime: { raw, iso: item.iso },
        fmNumber: item.fmNumber,
      });
    }
    setFMNumbers(next);
    setMessage("Номери ФМ оновлено.");
    toast.success("Номери ФМ оновлено");
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
          <p className="text-base font-semibold">Номери фіскальних модулів</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ iso: "", fmNumber: "" })}
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
                  name={`fmNumbers.${index}.iso`}
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
                  name={`fmNumbers.${index}.fmNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер ФМ</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                  fmNumbers:
                    data.fmNumbers.map((item) => ({
                      iso: item.dateTime?.iso ?? "",
                      fmNumber: item.fmNumber,
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
