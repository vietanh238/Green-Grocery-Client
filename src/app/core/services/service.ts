import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly LOGIN_URL = environment.apiAuth + 'login/';
  private readonly NOTIFICATION_URL = environment.apiHome + 'notifications/';

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
}
