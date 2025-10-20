import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { DrawerModule } from 'primeng/drawer';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { Message } from 'primeng/message';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { WebSocketService } from '../../core/services/websocket.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Subscription } from 'rxjs';

interface Notification {
  id?: string;
  title: string;
  message: string;
  time: string;
  priority: string;
  isRead: boolean;
  time_now?: string;
  bg?: string;
  color?: string;
  icon?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
  imports: [
    Menubar,
    NgIf,
    NgFor,
    RouterLink,
    NgClass,
    OverlayBadgeModule,
    DrawerModule,
    Message,
    CommonModule,
    ToastModule,
    DialogModule,
    InputTextModule,
  ],
})
export class HeaderComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  notificationVisible: boolean = false;
  settingsVisible: boolean = false;
  searchVisible: boolean = false;
  drawerStyle: any = {};
  lstNotification: Notification[] = [];
  countNotifications: any = '';
  bellShake: boolean = false;
  searchQuery: string = '';
  isHiddenIconBell: boolean = false;

  private wsSubscription?: Subscription;

  readonly PRIORITY_HIGH_COLOR = '#fef3f3';
  readonly PRIORITY_MEDIUM_COLOR = '#fefce9';
  readonly PRIORITY_LOW_COLOR = '#f0fdf4';
  readonly PRIORITY_HIGH_TEXT = '#dc2626';
  readonly PRIORITY_MEDIUM_TEXT = '#cd8a04';
  readonly PRIORITY_LOW_TEXT = '#2563eb';
  readonly READED_COLOR = '#f9fafb';

  constructor(
    public router: Router,
    private service: Service,
    private cdr: ChangeDetectorRef,
    private message: MessageService,
    private ws: WebSocketService
  ) {}

  ngOnInit() {
    this.ws.connect();
    this.setupMenuItems();
    this.setupDrawerStyle();
    this.subscribeToWebSocket();
    this.loadInitialNotifications();
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.ws.disconnect();
  }

  private setupMenuItems() {
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
        routerLink: ['/page/products'],
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Công nợ',
        icon: 'pi pi-users',
        routerLink: ['/page/debit'],
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

  private setupDrawerStyle() {
    this.drawerStyle = window.innerWidth < 700 ? { width: '20rem' } : { width: '30rem' };
    this.isHiddenIconBell = window.innerWidth < 700 ? true : false;
  }

  private subscribeToWebSocket() {
    this.wsSubscription = this.ws.message$.subscribe((ms: any) => {
      if (ms) {
        this.handleWebSocketMessage(ms);
      }
    });
  }

  private handleWebSocketMessage(ms: any) {
    if (ms?.message_type === 'remind_reorder') {
      const countProductReorder = ms?.items?.length;
      if (countProductReorder) {
        const notification: Notification = {
          id: `reorder_${Date.now()}`,
          title: 'Nhắc nhở nhập hàng',
          message: `Có ${countProductReorder} sản phẩm cần nhập hàng`,
          time: new Date().toISOString(),
          priority: '1',
          isRead: false,
        };
        this.addNotification(notification);
      }
    } else if (ms?.message_type === 'notification') {
      const notification: Notification = {
        id: ms.id || `notif_${Date.now()}`,
        title: ms.title || 'Thông báo',
        message: ms.message || '',
        time: ms.time || new Date().toISOString(),
        priority: ms.priority || '3',
        isRead: false,
      };
      this.addNotification(notification);
    }
  }

  private addNotification(notification: Notification) {
    this.lstNotification.unshift(notification);
    this.updateNotificationCount();
    this.lstNotification = this.addAttribute();
    this.triggerBellAnimation();
    this.showToast(notification);
    this.cdr.detectChanges();
  }

  private loadInitialNotifications() {
    this.service.getNotifications().subscribe((data: any) => {
      if (data.status === ConstantDef.STATUS_SUCCESS) {
        this.lstNotification = (data.response?.message || []).map((item: any) => ({
          ...item,
          isRead: item.isRead || false,
        }));
        this.updateNotificationCount();
        this.lstNotification = this.addAttribute();
        this.cdr.detectChanges();
      }
    });
  }

  private updateNotificationCount() {
    const unreadCount = this.lstNotification.filter((n) => !n.isRead).length;
    this.countNotifications = unreadCount || '';
    if (unreadCount > 99) {
      this.countNotifications = '99+';
    }
  }

  private triggerBellAnimation() {
    this.bellShake = true;
    setTimeout(() => {
      this.bellShake = false;
      this.cdr.detectChanges();
    }, 1000);
  }

  private showToast(notification: Notification) {
    this.message.add({
      severity:
        notification.priority === '1' ? 'error' : notification.priority === '2' ? 'warn' : 'info',
      summary: notification.title,
      detail: notification.message,
      life: 5000,
    });
  }

  addAttribute() {
    const array = this.lstNotification.map((item: Notification) => {
      const time = new Date(item.time);
      const now = new Date();
      const diffInMs = now.getTime() - time.getTime();
      const seconds = Math.floor(diffInMs / 1000);

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

      if (item.isRead) {
        item.bg = this.READED_COLOR;
        item.color = '#6b7280';
      } else {
        switch (item.priority) {
          case '1':
            item.bg = this.PRIORITY_HIGH_COLOR;
            item.color = this.PRIORITY_HIGH_TEXT;
            item.icon = 'pi pi-arrow-up';
            break;
          case '2':
            item.bg = this.PRIORITY_MEDIUM_COLOR;
            item.color = this.PRIORITY_MEDIUM_TEXT;
            item.icon = 'pi pi-minus';
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
      }
      return item;
    });
    array.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return Number(a.priority) - Number(b.priority);
    });
    return array;
  }

  openNotificationDrawer() {
    this.notificationVisible = true;
  }

  openSettings() {
    this.settingsVisible = true;
  }

  openSearch() {
    this.searchVisible = true;
  }

  markAsRead(notification: Notification, event: Event) {
    event.stopPropagation();
    notification.isRead = true;
    this.updateNotificationCount();
    this.lstNotification = this.addAttribute();
    this.cdr.detectChanges();
  }

  markAllAsRead() {
    this.lstNotification.forEach((n) => (n.isRead = true));
    this.updateNotificationCount();
    this.lstNotification = this.addAttribute();
    this.cdr.detectChanges();
  }

  deleteNotification(notification: Notification, event: Event) {
    event.stopPropagation();
    const index = this.lstNotification.indexOf(notification);
    if (index > -1) {
      this.lstNotification.splice(index, 1);
      this.updateNotificationCount();
      this.cdr.detectChanges();
    }
  }

  clearAllNotifications() {
    this.lstNotification = [];
    this.updateNotificationCount();
    this.cdr.detectChanges();
  }

  onNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      notification.isRead = true;
      this.updateNotificationCount();
      this.lstNotification = this.addAttribute();
      this.cdr.detectChanges();
    }
  }

  handleSearch() {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
    }
  }
}
