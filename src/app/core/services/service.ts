import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';
import { param } from 'jquery';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly LOGIN_URL = environment.apiAuth + 'login/';
  private readonly NOTIFICATION_URL = environment.apiHome + 'notifications/';
  private readonly CREATE_PRODUCT_URL = environment.apiProduct + 'create/';
  private readonly GET_CATEGORIES_URL = environment.apiProduct + 'categories/';
  private readonly GET_PRODUCTS_URL = environment.apiProduct + 'products/';
  private readonly DELETE_RPODUCT = environment.apiProduct + 'delete/';
  private readonly UPDATE_PRODUCT = environment.apiProduct + 'update/';
  private readonly CREATE_PAYMENT = environment.apiPayment + 'create/';
  private readonly DELETE_PAYMENT = environment.apiPayment + 'delete/';
  private readonly GET_CUSTOMER = environment.apiDebit + 'get/customer/';
  private readonly GET_DEBIT = environment.apiDebit + 'get/debit/';
  private readonly CREATE_CUSTOMER = environment.apiDebit + 'create/customer/';
  private readonly CREATE_DEBIT = environment.apiDebit + 'create/debit/';
  private readonly PAY_DEBIT = environment.apiDebit + 'pay/debit/';
  private readonly DELETE_CUSTOMER = environment.apiDebit + 'delete/customer/';

  constructor(private _http: HttpClient) {}

  login(params: any): Observable<any> {
    return this._http.post(this.LOGIN_URL, {
      phone_number: params.phone_number,
      password: params.password,
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
    return this._http.post(this.CREATE_DEBIT, {
      customer_code: params.customer_code,
      debit_amount: params.debit_amount,
      due_date: params.due_date,
      note: params.note || '',
    });
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
}
