export const URL_SERVER = 'https://uncondemnable-faviola-nondeducible.ngrok-free.dev';
const apiConnectServer = URL_SERVER + '/api/';
export const environment = {
  apiCommon: apiConnectServer,
  apiAuth: apiConnectServer + 'account/',
  apiHome: apiConnectServer + 'home/',
  apiProduct: apiConnectServer + 'product/',
  apiSell: apiConnectServer + 'sell/',
  apiPayment: apiConnectServer + 'payments/',
};
