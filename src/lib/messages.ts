import { toast } from "sonner";

export const showNoIpMessage = () =>
  toast.error("Відсутня IP-адреса", {
    description: "Переконайтеся, що ви ввели та зберегли її.",
  });

export const showIpNotRespondingMessage = () =>
  toast.error("IP-адреса не відповідає", {
    description:
      "Перевірте, чи правильно введена IP-адреса та чи пристрій доступний.",
  });
