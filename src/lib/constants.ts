export const newProductRoute: Routing = {
  path: "/new-product",
  label: "Додати товар",
};

export const editProductRoute: Routing = {
  path: "/edit-product/:code",
  label: "Додати товар",
};

export const programRouts: Routing[] = [
  { path: "/", label: "Товари", subPath: [newProductRoute, editProductRoute] },
  { path: "/group", label: "Групи" },
  // { path: "/tax", label: "Податки" },
];

export const routing: Routing[] = [
  {
    path: "/",
    label: "Програмування",
    subPath: [...programRouts, newProductRoute],
  },
  { path: "/check", label: "Журнал" },
];

export interface Routing {
  path: string;
  label: string;
  subPath?: Routing[];
}
