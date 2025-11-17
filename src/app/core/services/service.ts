import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly LOGIN_URL = environment.apiAuth + 'login/';
  private readonly REGISTER_URL = environment.apiAuth + 'register/';
  private readonly NOTIFICATION_URL = environment.apiHome + 'notifications/';
  private readonly CREATE_PRODUCT_URL = environment.apiProduct + 'create/';
  private readonly BULK_CREATE_PRODUCTS_URL = environment.apiProduct + 'bulk-create/';
  private readonly GET_CATEGORIES_URL = environment.apiProduct + 'categories/';
  private readonly GET_PRODUCTS_URL = environment.apiProduct + 'products/';
  private readonly DELETE_RPODUCT = environment.apiProduct + 'delete/';
  private readonly UPDATE_PRODUCT = environment.apiProduct + 'update/';
  private readonly CREATE_PAYMENT = environment.apiPayment + 'create/';
  private readonly DELETE_PAYMENT = environment.apiPayment + 'delete/';
  private readonly CASH_PAYMENT = environment.apiPayment + 'cash/';
  private readonly GET_CUSTOMER = environment.apiDebit + 'get/customer/';
  private readonly GET_DEBIT = environment.apiDebit + 'get/debit/';
  private readonly CREATE_CUSTOMER = environment.apiDebit + 'create/customer/';
  private readonly CREATE_DEBIT = environment.apiDebit + 'create/debit/';
  private readonly PAY_DEBIT = environment.apiDebit + 'pay/debit/';
  private readonly DELETE_CUSTOMER = environment.apiDebit + 'delete/customer/';
  private readonly GET_BUSINESS_REPORT = environment.apiReport + 'get/';
  private readonly GET_DASHBOARD = environment.apiHome + 'get/dashboard/';
  private readonly GET_USER_PROFILE = environment.apiHome + 'user/profile/';
  private readonly QUICK_SEARCH = environment.apiHome + 'quick/search/';
  private readonly GET_TRANSACTION_HISTORY = environment.apiHome + 'transactions/history/';

  constructor(private _http: HttpClient) {}

  login(params: any): Observable<any> {
    return this._http.post(this.LOGIN_URL, {
      phone_number: params.phone_number,
      password: params.password,
    });
  }

  register(params: any): Observable<any> {
    return this._http.post(this.REGISTER_URL, {
      phone_number: params.phone_number,
      password: params.password,
      first_name: params.first_name,
      last_name: params.last_name,
    });
  }

  getNotifications(): Observable<any> {
    return this._http.get(this.NOTIFICATION_URL);
  }

  createProduct(params: any): Observable<any> {
    return this._http.post(this.CREATE_PRODUCT_URL, {
      name: params.productName,
      sku: params.sku,
      costPrice: params.costPrice,
      price: params.price,
      quantity: params.quantity,
      unit: params.unit,
      category: params.category,
      barCode: params.barCode,
      stock_quantity: params.quantity,
    });
  }

  bulkCreateProducts(params: any): Observable<any> {
    return this._http.post(this.BULK_CREATE_PRODUCTS_URL, params);
  }

  getCategories(): Observable<any> {
    return this._http.get(this.GET_CATEGORIES_URL);
  }

  getProducts(): Observable<any> {
    return this._http.get(this.GET_PRODUCTS_URL);
  }

  createPayment(params: any): Observable<any> {
    return this._http.post(this.CREATE_PAYMENT, params);
  }

  deletePayment(orderCode: any): Observable<any> {
    const url = this.DELETE_PAYMENT + orderCode + '/';
    return this._http.delete(url);
  }

  cashPayment(params: any): Observable<any> {
    return this._http.post(this.CASH_PAYMENT, params);
  }

  deleteProduct(barCode: string): Observable<any> {
    const url = this.DELETE_RPODUCT + barCode + '/';
    return this._http.delete(url);
  }

  updateProduct(data: any): Observable<any> {
    const params = data;
    return this._http.put(this.UPDATE_PRODUCT, params);
  }

  getCustomer(): Observable<any> {
    return this._http.get(this.GET_CUSTOMER);
  }

  getDebit(): Observable<any> {
    return this._http.get(this.GET_DEBIT);
  }

  createCustomer(params: any): Observable<any> {
    return this._http.post(this.CREATE_CUSTOMER, {
      name: params.name,
      phone: params.phone,
      address: params.address || '',
    });
  }

  createDebit(params: any): Observable<any> {
    return this._http.post(this.CREATE_DEBIT, params);
  }

  payDebit(params: any): Observable<any> {
    return this._http.post(this.PAY_DEBIT, {
      customer_code: params.customer_code,
      paid_amount: params.paid_amount,
      note: params.note || '',
    });
  }

  deleteCustomer(customer_code: string): Observable<any> {
    return this._http.delete(this.DELETE_CUSTOMER, {
      body: {
        customer_code: customer_code,
      },
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

    return this._http.get(this.GET_BUSINESS_REPORT, { params: queryParams });
  }

  getDashboardData(period: string = 'today'): Observable<any> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('period', period);

    return this._http.get(this.GET_DASHBOARD, { params: queryParams });
  }

  getUserProfile(): Observable<any> {
    return this._http.get(this.GET_USER_PROFILE);
  }

  quickSearch(query: string): Observable<any> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('q', query);

    return this._http.get(this.QUICK_SEARCH, { params: queryParams });
  }

  getTransactionHistory(params: any = {}): Observable<any> {
    let queryParams = new HttpParams();

    if (params.date_from) {
      queryParams = queryParams.set('date_from', params.date_from);
    }

    if (params.date_to) {
      queryParams = queryParams.set('date_to', params.date_to);
    }

    if (params.type) {
      queryParams = queryParams.set('type', params.type);
    }

    if (params.status) {
      queryParams = queryParams.set('status', params.status);
    }

    if (params.payment_method) {
      queryParams = queryParams.set('payment_method', params.payment_method);
    }

    return this._http.get(this.GET_TRANSACTION_HISTORY, { params: queryParams });
  }

  trainAIModel(): Observable<any> {
    return this._http.post(environment.apiHome + 'ai/train/', {});
  }

  getReorderRecommendations(): Observable<any> {
    return this._http.get(environment.apiHome + 'ai/reorder-recommendations/');
  }

  getProductForecast(productId: number): Observable<any> {
    return this._http.get(environment.apiHome + `ai/forecast/${productId}/`);
  }

  getSuppliers(): Observable<any> {
    return this._http.get(environment.apiHome);
  }
}
