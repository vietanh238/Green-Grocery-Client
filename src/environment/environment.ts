export const URL_SERVER = 'https://api.green-grocery.io.vn';
// export const URL_SERVER = 'http://127.0.0.1:8000';
const apiConnectServer = URL_SERVER + '/api/';
export const environment = {
  apiCommon: apiConnectServer,
  apiAuth: apiConnectServer + 'account/',
  apiHome: apiConnectServer + 'home/',
  apiProduct: apiConnectServer + 'product/',
  apiSell: apiConnectServer + 'sell/',
  apiPayment: apiConnectServer + 'payments/',
  apiDebit: apiConnectServer + 'debit/',
  apiReport: apiConnectServer + 'report/',
  apiPurchaseOrder: apiConnectServer + 'purchase-order/',
  apiInventory: apiConnectServer + 'inventory/',
};
