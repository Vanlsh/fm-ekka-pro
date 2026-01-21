import { useEffect } from "react";
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
import { useFiscalStore } from "@/store/fiscal";
import { toast } from "@/components/ui/sonner";
import { buildRawFromIso } from "@/lib/fm-datetime";

const fiscalModeSchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
});

type FiscalModeFormValues = z.infer<typeof fiscalModeSchema>;

export const FiscalModeStartPage = () => {
  const { data, setMessage, setFiscalModeStart } = useFiscalStore();

  const form = useForm<FiscalModeFormValues>({
    resolver: zodResolver(fiscalModeSchema),
    defaultValues: {
      iso: data?.fiscalModeStart?.dateTime?.iso ?? "",
    },
  });

  useEffect(() => {
    if (data?.fiscalModeStart) {
      form.reset({
        iso: data.fiscalModeStart.dateTime?.iso ?? "",
      });
    }
  }, [data?.fiscalModeStart, form]);

  const onSubmit: SubmitHandler<FiscalModeFormValues> = (values) => {
    if (!data) return;
    const raw =
      buildRawFromIso(values.iso) ?? data.fiscalModeStart?.dateTime?.raw;
    if (!raw) return;
    const next = {
      dateTime: { raw, iso: values.iso },
    };
    setFiscalModeStart(next);
    setMessage("Фіскальний режим оновлено.");
    toast.success("Фіскальний режим оновлено");
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
            <p className="text-base font-semibold">Фіскальний режим</p>

            <FormField
              control={form.control}
              name="iso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISO Дата/час</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" className="w-full md:w-auto">
                Зберегти зміни
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
};
