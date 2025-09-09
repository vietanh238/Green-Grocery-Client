import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Service {
  private readonly loginUrl = environment.apiAuth + 'login/';

  constructor(private _http: HttpClient) {}

  login(params: any): Observable<any> {
    return this._http.post(this.loginUrl, {
      phone_number: params.phone_number,
      password: params.password,
    });
  }
}
