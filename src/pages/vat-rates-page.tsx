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

const vatEntrySchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
  VatA: z.number(),
  VatB: z.number(),
  VatC: z.number(),
  VatD: z.number(),
  VatM: z.number(),
  VatH: z.number(),
  DecPoint: z.number(),
  VATExcluded: z.number(),
  AssociatedMask: z.number(),
});

const vatSchema = z.object({
  vatRates: z
    .array(vatEntrySchema)
    .min(1, "Потрібен хоча б один запис")
    .max(8, "Не більше 8 записів"),
});

type VatFormValues = z.infer<typeof vatSchema>;

export const VatRatesPage = () => {
  const { data, setVatRates, setMessage } = useFiscalStore();

  const form = useForm<VatFormValues>({
    resolver: zodResolver(vatSchema),
    defaultValues: {
      vatRates:
        data?.vatRates.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          VatA: item.VatA,
          VatB: item.VatB,
          VatC: item.VatC,
          VatD: item.VatD,
          VatM: item.VatM,
          VatH: item.VatH,
          DecPoint: item.DecPoint,
          VATExcluded: item.VATExcluded,
          AssociatedMask: item.AssociatedMask,
        })) ?? [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "vatRates",
  });
  const [listRef] = useAutoAnimate<HTMLDivElement>({
    duration: 250,
    easing: "ease-in-out",
  });

  useEffect(() => {
    if (data?.vatRates) {
      form.reset({
        vatRates: data.vatRates.map((item) => ({
          iso: item.dateTime?.iso ?? "",
          VatA: item.VatA,
          VatB: item.VatB,
          VatC: item.VatC,
          VatD: item.VatD,
          VatM: item.VatM,
          VatH: item.VatH,
          DecPoint: item.DecPoint,
          VATExcluded: item.VATExcluded,
          AssociatedMask: item.AssociatedMask,
        })),
      });
    }
  }, [data?.vatRates, form]);

  const onSubmit: SubmitHandler<VatFormValues> = (values) => {
    if (!data) return;
    const next = values.vatRates.map((item, idx) => {
      const raw = data.vatRates[idx]?.dateTime?.raw ?? { time: 0, date: 0 };
      return {
        dateTime: { raw, iso: item.iso },
        VatA: item.VatA,
        VatB: item.VatB,
        VatC: item.VatC,
        VatD: item.VatD,
        VatM: item.VatM,
        VatH: item.VatH,
        DecPoint: item.DecPoint,
        VATExcluded: item.VATExcluded,
        AssociatedMask: item.AssociatedMask,
      };
    });
    setVatRates(next);
    setMessage("Ставки ПДВ оновлено.");
    toast.success("Ставки ПДВ оновлено");
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
          <p className="text-base font-semibold">Ставки ПДВ</p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                iso: "",
                VatA: 0,
                VatB: 0,
                VatC: 0,
                VatD: 0,
                VatM: 0,
                VatH: 0,
                DecPoint: 0,
                VATExcluded: 0,
                AssociatedMask: 0,
              })
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
                  name={`vatRates.${index}.iso`}
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
                  name={`vatRates.${index}.AssociatedMask`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mask</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                {(["VatA", "VatB", "VatC", "VatD"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={`vatRates.${index}.${name}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name}</FormLabel>
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
                ))}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                {(["VatM", "VatH", "DecPoint"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={`vatRates.${index}.${name}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name}</FormLabel>
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
                ))}
                <FormField
                  control={form.control}
                  name={`vatRates.${index}.VATExcluded`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VATExcluded</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                  vatRates:
                    data.vatRates.map((item) => ({
                      iso: item.dateTime?.iso ?? "",
                      VatA: item.VatA,
                      VatB: item.VatB,
                      VatC: item.VatC,
                      VatD: item.VatD,
                      VatM: item.VatM,
                      VatH: item.VatH,
                      DecPoint: item.DecPoint,
                      VATExcluded: item.VATExcluded,
                      AssociatedMask: item.AssociatedMask,
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
