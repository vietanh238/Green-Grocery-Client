import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly API_AUTH = environment.apiAuth;
  private readonly API_HOME = environment.apiHome;
  private readonly API_PRODUCT = environment.apiProduct;
  private readonly API_PAYMENT = environment.apiPayment;
  private readonly API_DEBIT = environment.apiDebit;
  private readonly API_REPORT = environment.apiReport;
  private readonly API_PURCHASE_ORDER = environment.apiPurchaseOrder;
  private readonly API_INVENTORY = environment.apiInventory;

  private readonly paymentSuccessSubject = new Subject<any>();
  public readonly paymentSuccess$ = this.paymentSuccessSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  private buildHttpParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return httpParams;
  }

  login(credentials: { phone_number: string; password: string }): Observable<any> {
    return this.http.post(`${this.API_AUTH}login/`, credentials);
  }

  register(userData: {
    phone_number: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Observable<any> {
    return this.http.post(`${this.API_AUTH}register/`, userData);
  }

  getNotifications(): Observable<any> {
    return this.http.get(`${this.API_HOME}notifications/`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${this.API_PRODUCT}categories/`);
  }

  getProducts(filters?: Record<string, any>): Observable<any> {
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    return this.http.get(`${this.API_PRODUCT}products/`, { params });
  }

  checkBarcodeExists(barcode: string): Observable<any> {
    return this.http.get(`${this.API_PRODUCT}products/`, {
      params: new HttpParams().set('bar_code', barcode),
    });
  }

  checkSkuExists(sku: string): Observable<any> {
    return this.http.get(`${this.API_PRODUCT}products/`, {
      params: new HttpParams().set('sku', sku),
    });
  }

  createProduct(productData: any): Observable<any> {
    return this.http.post(`${this.API_PRODUCT}create/`, productData);
  }

  updateProduct(productData: any): Observable<any> {
    return this.http.put(`${this.API_PRODUCT}update/`, productData);
  }

  deleteProduct(barCode: string): Observable<any> {
    return this.http.delete(`${this.API_PRODUCT}delete/${barCode}/`);
  }

  bulkCreateProducts(productsData: any): Observable<any> {
    return this.http.post(`${this.API_PRODUCT}bulk-create/`, productsData);
  }

  parseProductInvoiceImage(formData: FormData): Observable<any> {
    return this.http.post(`${this.API_PRODUCT}invoice/parse/`, formData);
  }

  getSuppliers(): Observable<any> {
    return this.http.get(`${this.API_PRODUCT}suppliers/`);
  }

  createSupplier(supplierData: any): Observable<any> {
    return this.http.post(`${this.API_PRODUCT}supplier/create/`, supplierData);
  }

  updateSupplier(supplierData: any): Observable<any> {
    return this.http.put(`${this.API_PRODUCT}supplier/update/`, supplierData);
  }

  deleteSupplier(supplierCode: string): Observable<any> {
    return this.http.delete(`${this.API_PRODUCT}supplier/delete/${supplierCode}/`);
  }

  createPayment(paymentData: {
    orderCode: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    items: any[];
    buyerName?: string;
    buyerPhone?: string;
  }): Observable<any> {
    return this.http.post(`${this.API_PAYMENT}create/`, {
      orderCode: paymentData.orderCode,
      amount: paymentData.amount,
      description: paymentData.description,
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      items: paymentData.items,
      buyerName: paymentData.buyerName || '',
      buyerPhone: paymentData.buyerPhone || '',
    });
  }

  deletePayment(orderCode: string): Observable<any> {
    return this.http.delete(`${this.API_PAYMENT}delete/${orderCode}/`);
  }

  cashPayment(paymentData: {
    amount: number;
    items: any[];
    payment_method?: string;
    note?: string;
  }): Observable<any> {
    return this.http.post(`${this.API_PAYMENT}cash/`, {
      amount: paymentData.amount,
      items: paymentData.items,
      payment_method: paymentData.payment_method || 'cash',
      note: paymentData.note || '',
    });
  }

  getCustomers(): Observable<any> {
    return this.http.get(`${this.API_DEBIT}get/customer/`);
  }

  getDebits(): Observable<any> {
    return this.http.get(`${this.API_DEBIT}get/debit/`);
  }

  createCustomer(customerData: {
    name: string;
    phone: string;
    address?: string;
  }): Observable<any> {
    return this.http.post(`${this.API_DEBIT}create/customer/`, {
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address || '',
    });
  }

  createDebit(debitData: any): Observable<any> {
    return this.http.post(`${this.API_DEBIT}create/debit/`, debitData);
  }

  payDebit(paymentData: {
    customer_code: string;
    paid_amount: number;
    note?: string;
  }): Observable<any> {
    return this.http.post(`${this.API_DEBIT}pay/debit/`, {
      customer_code: paymentData.customer_code,
      paid_amount: paymentData.paid_amount,
      note: paymentData.note || '',
    });
  }

  deleteCustomer(customerCode: string): Observable<any> {
    return this.http.delete(`${this.API_DEBIT}delete/customer/`, {
      body: { customer_code: customerCode },
    });
  }

  getBusinessReport(reportParams: {
    period: string;
    date_from?: string;
    date_to?: string;
  }): Observable<any> {
    const params = new HttpParams().set('period', reportParams.period);
    if (reportParams.period === 'custom' && reportParams.date_from && reportParams.date_to) {
      return this.http.get(`${this.API_REPORT}get/`, {
        params: params
          .set('date_from', reportParams.date_from)
          .set('date_to', reportParams.date_to),
      });
    }
    return this.http.get(`${this.API_REPORT}get/`, { params });
  }

  getDashboardData(period: string = 'today'): Observable<any> {
    return this.http.get(`${this.API_HOME}get/dashboard/`, {
      params: new HttpParams().set('period', period),
    });
  }

  getUserProfile(): Observable<any> {
    return this.http.get(`${this.API_HOME}user/profile/`);
  }

  quickSearch(query: string): Observable<any> {
    return this.http.get(`${this.API_HOME}quick/search/`, {
      params: new HttpParams().set('q', query),
    });
  }

  getTransactionHistory(filters: {
    date_from?: string;
    date_to?: string;
    type?: string;
    status?: string;
    payment_method?: string;
  } = {}): Observable<any> {
    return this.http.get(`${this.API_HOME}transactions/history/`, {
      params: this.buildHttpParams(filters),
    });
  }

  trainAIModel(): Observable<any> {
    return this.http.post(`${this.API_HOME}ai/train/`, {});
  }

  getReorderRecommendations(): Observable<any> {
    return this.http.get(`${this.API_HOME}ai/reorder-recommendations/`);
  }

  getProductForecast(productId: number): Observable<any> {
    return this.http.get(`${this.API_HOME}ai/forecast/${productId}/`);
  }

  notifyPaymentSuccess(data: any): void {
    this.paymentSuccessSubject.next(data);
  }

  createPurchaseOrder(orderData: any): Observable<any> {
    return this.http.post(`${this.API_PURCHASE_ORDER}create/`, orderData);
  }

  getPurchaseOrders(filters?: Record<string, any>): Observable<any> {
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    return this.http.get(`${this.API_PURCHASE_ORDER}list/`, { params });
  }

  getPurchaseOrderDetail(poId: number): Observable<any> {
    return this.http.get(`${this.API_PURCHASE_ORDER}detail/${poId}/`);
  }

  updatePurchaseOrderStatus(poId: number, status: string): Observable<any> {
    return this.http.put(`${this.API_PURCHASE_ORDER}update-status/${poId}/`, { status });
  }

  receivePurchaseOrder(poId: number, receivedItems: any[]): Observable<any> {
    return this.http.post(`${this.API_PURCHASE_ORDER}receive/${poId}/`, {
      received_items: receivedItems,
    });
  }

  deletePurchaseOrder(poId: number): Observable<any> {
    return this.http.delete(`${this.API_PURCHASE_ORDER}delete/${poId}/`);
  }

  sendPurchaseOrderEmail(poId: number): Observable<any> {
    return this.http.post(`${this.API_PURCHASE_ORDER}send-email/${poId}/`, {});
  }

  getInventoryHistory(productId: number, filters?: Record<string, any>): Observable<any> {
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    return this.http.get(`${this.API_INVENTORY}history/${productId}/`, { params });
  }

  adjustInventory(adjustmentData: any): Observable<any> {
    return this.http.post(`${this.API_INVENTORY}adjust/`, adjustmentData);
  }

  recordDamage(damageData: any): Observable<any> {
    return this.http.post(`${this.API_INVENTORY}damage/`, damageData);
  }

  recordLost(lostData: any): Observable<any> {
    return this.http.post(`${this.API_INVENTORY}lost/`, lostData);
  }

  returnStock(returnData: any): Observable<any> {
    return this.http.post(`${this.API_INVENTORY}return/`, returnData);
  }

  getInventorySummary(filters?: Record<string, any>): Observable<any> {
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    return this.http.get(`${this.API_INVENTORY}summary/`, { params });
  }

  getInventoryMovementReport(startDate?: string, endDate?: string): Observable<any> {
    const params = this.buildHttpParams({ start_date: startDate, end_date: endDate });
    return this.http.get(`${this.API_REPORT}inventory-movement/`, { params });
  }

  getSupplierPerformanceReport(startDate?: string, endDate?: string): Observable<any> {
    const params = this.buildHttpParams({ start_date: startDate, end_date: endDate });
    return this.http.get(`${this.API_REPORT}supplier-performance/`, { params });
  }

  getCustomerBehaviorReport(startDate?: string, endDate?: string): Observable<any> {
    const params = this.buildHttpParams({ start_date: startDate, end_date: endDate });
    return this.http.get(`${this.API_REPORT}customer-behavior/`, { params });
  }

  cancelOrder(orderCode: string, reason: string): Observable<any> {
    return this.http.post(`${this.API_PAYMENT}cancel/${orderCode}/`, { reason });
  }

  refundOrder(refundData: {
    orderCode: string;
    refundAmount?: number;
    reason?: string;
    items?: any[];
  }): Observable<any> {
    const payload: any = { reason: refundData.reason || 'Hoàn tiền' };
    if (refundData.refundAmount) payload.refund_amount = refundData.refundAmount;
    if (refundData.items) payload.items = refundData.items;
    return this.http.post(`${this.API_PAYMENT}refund/${refundData.orderCode}/`, payload);
  }
}
