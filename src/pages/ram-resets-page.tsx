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
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { buildRawFromIso } from "@/lib/fm-datetime";

const resetEntrySchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
  NextZNumber: z.number(),
  Flag: z.number(),
});

const resetSchema = z.object({
  ramResets: z
    .array(resetEntrySchema)
    .min(0)
    .max(100, "Не більше 100 записів"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export const RamResetsPage = () => {
  const { data, setRamResets, setMessage } = useFiscalStore();

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      ramResets:
        data?.ramResets.map((item) => ({
          iso: item?.dateTime?.iso ?? "",
          NextZNumber: item?.NextZNumber ?? 0,
          Flag: item?.Flag ?? 0,
        })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ramResets",
  });
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 250,
    easing: "ease-in-out",
  });

  useEffect(() => {
    if (data?.ramResets) {
      form.reset({
        ramResets: data.ramResets.map((item) => ({
          iso: item?.dateTime?.iso ?? "",
          NextZNumber: item?.NextZNumber ?? 0,
          Flag: item?.Flag ?? 0,
        })),
      });
    }
  }, [data?.ramResets, form]);

  const onSubmit: SubmitHandler<ResetFormValues> = (values) => {
    if (!data) return;
    const next = [];
    for (let idx = 0; idx < values.ramResets.length; idx += 1) {
      const item = values.ramResets[idx];
      const raw =
        buildRawFromIso(item.iso) ?? data.ramResets[idx]?.dateTime?.raw;
      if (!raw) return;
      next.push({
        dateTime: { raw, iso: item.iso },
        NextZNumber: item.NextZNumber,
        Flag: item.Flag,
      });
    }
    setRamResets(next);
    setMessage("RAM скидання оновлено.");
    toast.success("RAM скидання оновлено");
  };

  const handleDeleteAll = () => {
    form.reset({ ramResets: [] });
    setRamResets([]);
    setMessage("Усі скидання RAM видалено.");
    toast.success("Усі скидання RAM видалено");
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
          <p className="text-base font-semibold">Скидання RAM</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ iso: "", NextZNumber: 0, Flag: 0 })}
              disabled={fields.length >= 100}
            >
              Додати
            </Button>
            <Button type="button" variant="ghost" onClick={handleDeleteAll}>
              Видалити всі
            </Button>
          </div>
        </div>

        <div className="space-y-3" ref={listRef}>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-2 rounded-lg border border-border p-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">#{index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 0}
                >
                  Видалити
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`ramResets.${index}.iso`}
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

              <div className="grid gap-2 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`ramResets.${index}.NextZNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Наступний Z</FormLabel>
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
                  name={`ramResets.${index}.Flag`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flag</FormLabel>
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
                  ramResets:
                    data.ramResets.map((item) => ({
                      iso: item?.dateTime?.iso ?? "",
                      NextZNumber: item?.NextZNumber ?? 0,
                      Flag: item?.Flag ?? 0,
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
