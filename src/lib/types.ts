export interface Product {
  code: number;
  name: string;
  barcode: string;
  // globalCode: string;
  tax: number;
  price: number;
  isWeight: boolean;
  // mrcPrice: number;
  amount: number;
  group: string;
  uktzed: string;
  unit: string;
  freePrice: boolean;
}

export interface Group {
  code: number;
  name: string;
}
export interface Tax {
  code: number;
  name: string;
}
export interface ArticleSaveResponse {
  success: boolean;
  message: string;
  saved_articles: Product[];
  updated_articles: Product[];
}

export interface GroupSaveResponse {
  success: boolean;
  message: string;
  saved_groups: Group[];
  updated_groups: Group[];
}

export interface TaxSaveResponse {
  success: boolean;
  message: string;
  saved_groups: Tax[];
  updated_groups: Tax[];
}
export interface SuccessResponse<T> {
  success: true;
  error: false;
  data: T;
}

export interface ErrorResponse {
  error: true;
  success: false;
}

export interface CheckParams {
  date_from: string;
  date_to: string;
}

export interface CheckResponse {
  data: {
    checks: Check[];
  };
  message: string;
  success: boolean;
}

export interface Check {
  details: CheckDetail[];
  header: CheckHeader;
}

export interface CheckHeader {
  cardSum: number;
  cashSum: number;
  date: string;
  isFiscal: boolean;
  numCheck: number;
  numSmenLocal: number;
  numSmenPrro: number;
  textCheck: string;
  totalSum: number;
  typeCheck: number;
  typePay: number;
}

export interface CheckDetail {
  amount: number;
  barcode: string;
  code: number;
  name: string;
  price: number;
  serial: string;
  sum: number;
  tax: number;
  uktzed: string;
}

export interface ProductResponse {
  success: boolean;
  articles: Product[];
}
