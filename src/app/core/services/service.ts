import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable, Subject } from 'rxjs';

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

  private paymentSuccessSubject = new Subject<any>();
  public paymentSuccess$ = this.paymentSuccessSubject.asObservable();

  constructor(private _http: HttpClient) {}

  login(params: any): Observable<any> {
    return this._http.post(`${this.API_AUTH}login/`, {
      phone_number: params.phone_number,
      password: params.password,
    });
  }

  register(params: any): Observable<any> {
    return this._http.post(`${this.API_AUTH}register/`, {
      phone_number: params.phone_number,
      password: params.password,
      first_name: params.first_name,
      last_name: params.last_name,
    });
  }

  getNotifications(): Observable<any> {
    return this._http.get(`${this.API_HOME}notifications/`);
  }

  getCategories(): Observable<any> {
    return this._http.get(`${this.API_PRODUCT}categories/`);
  }

  getProducts(): Observable<any> {
    return this._http.get(`${this.API_PRODUCT}products/`);
  }

  createProduct(params: any): Observable<any> {
    return this._http.post(`${this.API_PRODUCT}create/`, params);
  }

  updateProduct(params: any): Observable<any> {
    return this._http.put(`${this.API_PRODUCT}update/`, params);
  }

  deleteProduct(barCode: string): Observable<any> {
    return this._http.delete(`${this.API_PRODUCT}delete/${barCode}/`);
  }

  bulkCreateProducts(params: any): Observable<any> {
    return this._http.post(`${this.API_PRODUCT}bulk-create/`, params);
  }

  getSuppliers(): Observable<any> {
    return this._http.get(`${this.API_PRODUCT}suppliers/`);
  }

  createSupplier(params: any): Observable<any> {
    return this._http.post(`${this.API_PRODUCT}supplier/create/`, params);
  }

  updateSupplier(params: any): Observable<any> {
    return this._http.put(`${this.API_PRODUCT}supplier/update/`, params);
  }

  deleteSupplier(supplierCode: string): Observable<any> {
    return this._http.delete(`${this.API_PRODUCT}supplier/delete/${supplierCode}/`);
  }

  createPayment(params: any): Observable<any> {
    return this._http.post(`${this.API_PAYMENT}create/`, {
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      items: params.items,
      buyerName: params.buyerName || '',
      buyerPhone: params.buyerPhone || '',
    });
  }

  deletePayment(orderCode: string): Observable<any> {
    return this._http.delete(`${this.API_PAYMENT}delete/${orderCode}/`);
  }

  cashPayment(params: any): Observable<any> {
    return this._http.post(`${this.API_PAYMENT}cash/`, {
      amount: params.amount,
      items: params.items,
      payment_method: params.payment_method || 'cash',
      note: params.note || '',
    });
  }

  getCustomers(): Observable<any> {
    return this._http.get(`${this.API_DEBIT}get/customer/`);
  }

  getDebits(): Observable<any> {
    return this._http.get(`${this.API_DEBIT}get/debit/`);
  }

  createCustomer(params: any): Observable<any> {
    return this._http.post(`${this.API_DEBIT}create/customer/`, {
      name: params.name,
      phone: params.phone,
      address: params.address || '',
    });
  }

  createDebit(params: any): Observable<any> {
    return this._http.post(`${this.API_DEBIT}create/debit/`, params);
  }

  payDebit(params: any): Observable<any> {
    return this._http.post(`${this.API_DEBIT}pay/debit/`, {
      customer_code: params.customer_code,
      paid_amount: params.paid_amount,
      note: params.note || '',
    });
  }

  deleteCustomer(customer_code: string): Observable<any> {
    return this._http.delete(`${this.API_DEBIT}delete/customer/`, {
      body: { customer_code },
    });
  }

  getBusinessReport(params: any): Observable<any> {
    let queryParams = new HttpParams();

    if (params.period === 'custom') {
      queryParams = queryParams.set('period', 'custom');
      queryParams = queryParams.set('date_from', params.date_from);
      queryParams = queryParams.set('date_to', params.date_to);
    } else {
      queryParams = queryParams.set('period', params.period);
    }

    return this._http.get(`${this.API_REPORT}get/`, { params: queryParams });
  }

  getDashboardData(period: string = 'today'): Observable<any> {
    const queryParams = new HttpParams().set('period', period);
    return this._http.get(`${this.API_HOME}get/dashboard/`, { params: queryParams });
  }

  getUserProfile(): Observable<any> {
    return this._http.get(`${this.API_HOME}user/profile/`);
  }

  quickSearch(query: string): Observable<any> {
    const queryParams = new HttpParams().set('q', query);
    return this._http.get(`${this.API_HOME}quick/search/`, { params: queryParams });
  }

  getTransactionHistory(params: any = {}): Observable<any> {
    let queryParams = new HttpParams();

    if (params.date_from) queryParams = queryParams.set('date_from', params.date_from);
    if (params.date_to) queryParams = queryParams.set('date_to', params.date_to);
    if (params.type) queryParams = queryParams.set('type', params.type);
    if (params.status) queryParams = queryParams.set('status', params.status);
    if (params.payment_method)
      queryParams = queryParams.set('payment_method', params.payment_method);

    return this._http.get(`${this.API_HOME}transactions/history/`, { params: queryParams });
  }

  trainAIModel(): Observable<any> {
    return this._http.post(`${this.API_HOME}ai/train/`, {});
  }

  getReorderRecommendations(): Observable<any> {
    return this._http.get(`${this.API_HOME}ai/reorder-recommendations/`);
  }

  getProductForecast(productId: number): Observable<any> {
    return this._http.get(`${this.API_HOME}ai/forecast/${productId}/`);
  }

  notifyPaymentSuccess(data: any): void {
    this.paymentSuccessSubject.next(data);
  }
}
