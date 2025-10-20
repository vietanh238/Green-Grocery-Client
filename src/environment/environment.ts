export const URL_SERVER = 'https://api.green-grocery.io.vn';
const apiConnectServer = URL_SERVER + '/api/';
export const environment = {
  apiCommon: apiConnectServer,
  apiAuth: apiConnectServer + 'account/',
  apiHome: apiConnectServer + 'home/',
  apiProduct: apiConnectServer + 'product/',
  apiSell: apiConnectServer + 'sell/',
  apiPayment: apiConnectServer + 'payments/',
};
