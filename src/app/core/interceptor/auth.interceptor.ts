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
  const token = tokenService.getAccessToken();

  // Giữ nguyên logic cũ, chỉ thêm header ngrok-skip-browser-warning
  let authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      })
    : req.clone({
        setHeaders: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenService.clearAccessToken();
        router.navigate(['/login']);
        return throwError(() => new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
      }

      // Bổ sung xử lý khi ngrok trả về HTML thay vì JSON
      if (typeof error.error === 'string' && error.error.startsWith('<!DOCTYPE')) {
        return throwError(
          () =>
            new Error(
              'Ngrok trả về HTML thay vì JSON. Hãy chắc chắn đã thêm header ngrok-skip-browser-warning.'
            )
        );
      }

      return throwError(() => error);
    })
  );
};
