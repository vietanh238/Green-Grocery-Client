import { Injectable } from '@angular/core';
import { TokenService } from '../services/token.service';
import { CanActivate } from '@angular/router';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private tokenService: TokenService, private router: Router) {}

  canActivate(): boolean {
    const hasAccessToken = this.tokenService.getAccessToken() !== null;
    if (hasAccessToken) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}
