import { Component, OnInit } from '@angular/core';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { NgIf, NgClass } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import $ from 'jquery';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
  imports: [Menubar, NgIf, RouterLink, NgClass],
})
export class HeaderComponent implements OnInit {
  items: MenuItem[] | undefined;
  constructor(public router: Router) {}
  ngOnInit() {
    this.items = [
      {
        label: 'Trang chủ',
        icon: 'pi pi-home',
        routerLink: ['/page/home'],
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Bán hàng',
        icon: 'pi pi-shopping-cart',
        routerLink: ['/page/sell'],
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Sản phẩm',
        icon: 'pi pi-shop',
        routerLink: ['/page/product'],
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Công nợ',
        icon: 'pi pi-users',
        routerLink: ['/page/debt'],
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Báo cáo',
        icon: 'pi pi-chart-bar',
        routerLink: ['/page/report'],
        routerLinkActiveOptions: { exact: true },
      },
    ];
  }
}
