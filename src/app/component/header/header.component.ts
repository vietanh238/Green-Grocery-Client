import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { NgIf, NgClass } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import $ from 'jquery';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { DrawerModule } from 'primeng/drawer';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { Message } from 'primeng/message';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
  imports: [
    Menubar,
    NgIf,
    RouterLink,
    NgClass,
    OverlayBadgeModule,
    DrawerModule,
    Message,
    CommonModule,
  ],
})
export class HeaderComponent implements OnInit {
  items: MenuItem[] | undefined;
  visible: boolean = false;
  drawerStyle: any = {};
  lstNotification: any[] = [];
  lst: any[] = [];
  countNotifications: any = '';

  readonly PRIORITY_HIGH_COLOR = '#fef3f3';
  readonly PRIORITY_MEDIUM_COLOR = '#fefce9';
  readonly PRIORITY_LOW_COLOR = '#f0fdf4';
  readonly PRIORITY_HIGH_TEXT = '#dc2626';
  readonly PRIORITY_MEDIUM_TEXT = '#cd8a04';
  readonly PRIORITY_LOW_TEXT = '#2563eb';
  readonly READED_COLOR = '#f9fafb';

  constructor(public router: Router, private service: Service, private cdr: ChangeDetectorRef) {}
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
    this.drawerStyle = window.innerWidth < 700 ? { width: '20rem' } : { width: '25rem' };
    this.getNotifications();
    setInterval(() => {
      this.getNotifications();
    }, 10000);
  }

  openDrawer() {
    this.visible = true;
  }

  addAttribute() {
    const array = this.lstNotification.map((item: any) => {
      const time = new Date(item.time);
      const now = new Date();
      const diffInMs = now.getTime() - time.getTime();
      const seconds = Math.floor(diffInMs / 1000);
      const color = '';

      if (seconds < 60) {
        item.time_now = `${seconds} giây trước`;
      } else {
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
          item.time_now = `${minutes} phút trước`;
        } else {
          const hours = Math.floor(minutes / 60);
          if (hours < 24) {
            item.time_now = `${hours} giờ trước`;
          } else {
            const days = Math.floor(hours / 24);
            if (days === 1) {
              item.time_now = 'Hôm qua';
            } else {
              item.time_now = `${days} ngày trước`;
            }
          }
        }
      }
      // set color
      switch (item.priority) {
        case '1':
          item.bg = this.PRIORITY_HIGH_COLOR;
          item.color = this.PRIORITY_HIGH_TEXT;
          item.icon = 'pi pi-arrow-up';
          break;
        case '2':
          item.bg = this.PRIORITY_MEDIUM_COLOR;
          item.color = this.PRIORITY_MEDIUM_TEXT;
          item.icon = 'pi pi-arrow-right-arrow-left';

          break;
        case '3':
          item.bg = this.PRIORITY_LOW_COLOR;
          item.color = this.PRIORITY_LOW_TEXT;
          item.icon = 'pi pi-arrow-down';

          break;

        default:
          item.bg = '';
          break;
      }
      return item;
    });
    array.sort((a, b) => a.priority - b.priority);
    return array;
  }
  getNotifications() {
    this.service.getNotifications().subscribe((data: any) => {
      if (data.status === ConstantDef.STATUS_SUCCESS) {
        this.lstNotification = data.response?.message;
        this.countNotifications = data.response?.message.length || '';
        if (this.countNotifications > 99) {
          this.countNotifications = '99+';
        }
        this.lstNotification = this.addAttribute();
      } else {
      }
    });
  }
}
