import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem('access', this.accessToken);
  }

  getAccessToken(): string | null {
    const accessToken = localStorage.getItem('access');
    return accessToken;
  }

  clearAccessToken(): void {
    localStorage.clear();
  }
}
