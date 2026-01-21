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

const serialSchema = z.object({
  iso: z.string().min(1, "Дата не може бути порожньою"),
  countryNumber: z.number().int().nonnegative("Повинно бути числом"),
  serialNumber: z.string().min(1, "Серійний номер обов'язковий"),
});

type SerialFormValues = z.infer<typeof serialSchema>;

export const SerialPage = () => {
  const { data, setMessage, setSerial } = useFiscalStore();

  const form = useForm<SerialFormValues>({
    resolver: zodResolver(serialSchema),
    defaultValues: {
      iso: data?.serialRecord?.dateTime?.iso ?? "",
      countryNumber: data?.serialRecord?.countryNumber ?? 0,
      serialNumber: data?.serialRecord?.serialNumber ?? "",
    },
  });

  useEffect(() => {
    if (data?.serialRecord) {
      form.reset({
        iso: data.serialRecord.dateTime?.iso ?? "",
        countryNumber: data.serialRecord.countryNumber ?? 0,
        serialNumber: data.serialRecord.serialNumber ?? "",
      });
    }
  }, [data?.serialRecord, form]);

  const onSubmit: SubmitHandler<SerialFormValues> = (values) => {
    if (!data) return;
    const raw = data.serialRecord?.dateTime?.raw ?? { time: 0, date: 0 };
    const next = {
      dateTime: data.serialRecord
        ? { ...data.serialRecord.dateTime, raw, iso: values.iso }
        : { raw, iso: values.iso },
      countryNumber: values.countryNumber,
      serialNumber: values.serialNumber,
    };
    setSerial(next);
    setMessage("Серійну інформацію оновлено.");
    toast.success("Серійну інформацію оновлено");
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
            <p className="text-base font-semibold">Серійний запис</p>

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

            <FormField
              control={form.control}
              name="countryNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Код країни</FormLabel>
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

            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Серійний номер</FormLabel>
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
