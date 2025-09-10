import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export const authInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  let authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${tokenService.getAccessToken() || ''}`,
    },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenService.clearAccessToken();
        router.navigate(['/login']);
        return throwError(() => new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
      }
      return throwError(() => error);
    })
  );
};
