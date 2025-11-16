import { provideRouter, withComponentInputBinding } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { HomeComponent } from './features/home/home.component';
import { ProductsComponent } from './features/products/products.component';
import { SellComponent } from './features/sell/sell.component';
import { DebtComponent } from './features/debit/debit.component';
import { ReportComponent } from './features/report/report.component';
import { HistoryComponent } from './features/history/history.component';
import { AiReorderComponent } from './features/ai-reorder/ai-reorder.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'page',
    loadComponent: () => import('./component/page/page.component').then((m) => m.PageComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        component: HomeComponent,
      },
      {
        path: 'products',
        component: ProductsComponent,
      },
      {
        path: 'sell',
        component: SellComponent,
      },
      {
        path: 'debit',
        component: DebtComponent,
      },
      {
        path: 'report',
        component: ReportComponent,
      },
      {
        path: 'history',
        component: HistoryComponent,
      },
      {
        path: 'ai-reorder',
        component: AiReorderComponent,
      },
    ],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
