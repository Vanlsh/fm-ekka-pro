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

const resetEntrySchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
});

const resetSchema = z.object({
  ramResets: z
    .array(resetEntrySchema)
    .min(0)
    .max(8, "Не більше 8 записів"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export const RamResetsPage = () => {
  const { data, setRamResets, setMessage } = useFiscalStore();

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      ramResets:
        data?.ramResets.map((item) => ({
          iso: item?.iso ?? "",
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
          iso: item?.iso ?? "",
        })),
      });
    }
  }, [data?.ramResets, form]);

  const onSubmit: SubmitHandler<ResetFormValues> = (values) => {
    if (!data) return;
    const next = values.ramResets.map((item, idx) => {
      const raw = data.ramResets[idx]?.raw ?? { time: 0, date: 0 };
      return { raw, iso: item.iso };
    });
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
              onClick={() => append({ iso: "" })}
              disabled={fields.length >= 8}
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
                      iso: item?.iso ?? "",
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
