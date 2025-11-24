import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FormsModule } from '@angular/forms';
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

interface SearchHistory {
  id: string;
  query: string;
  type: string;
  timestamp: number;
}

interface UserSettings {
  darkMode: boolean;
  notificationSound: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
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
    ButtonModule,
    ToggleButtonModule,
    FormsModule,
  ],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInputRef?: ElementRef;

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

  searchHistory: SearchHistory[] = [];
  userProfile: UserProfile = {
    id: '',
    username: '',
    email: '',
    phone: '',
  };
  userSettings: UserSettings = {
    darkMode: false,
    notificationSound: true,
    desktopNotifications: true,
    emailNotifications: false,
  };

  private wsSubscription?: Subscription;
  private notificationAudio: HTMLAudioElement | null = null;

  readonly PRIORITY_HIGH_COLOR = '#fef3f3';
  readonly PRIORITY_MEDIUM_COLOR = '#fefce9';
  readonly PRIORITY_LOW_COLOR = '#f0fdf4';
  readonly PRIORITY_HIGH_TEXT = '#dc2626';
  readonly PRIORITY_MEDIUM_TEXT = '#cd8a04';
  readonly PRIORITY_LOW_TEXT = '#2563eb';
  readonly READED_COLOR = '#f9fafb';

  readonly MAX_SEARCH_HISTORY = 10;
  readonly STORAGE_KEYS = {
    SEARCH_HISTORY: 'app_search_history',
    USER_SETTINGS: 'app_user_settings',
  };

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
    this.loadSearchHistory();
    this.loadUserProfile();
    this.loadUserSettings();
    this.initNotificationAudio();
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
        label: 'AI Nhập hàng',
        icon: 'pi pi-bolt',
        routerLink: ['/page/ai-reorder'],
        routerLinkActiveOptions: { exact: true },
        style: { color: '#f59e0b' },
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
    console.log('📨 WebSocket message:', ms);

    if (ms?.message_type === 'remind_reorder') {
      // Data structure: ms.data.items (not ms.items)
      const items = ms?.data?.items || [];
      const count = ms?.data?.count || items.length;

      if (count > 0) {
        const notification: Notification = {
          id: `reorder_${Date.now()}`,
          title: '⚠️ Cảnh báo tồn kho',
          message: `Có ${count} sản phẩm sắp hết hàng, cần nhập ngay!`,
          time: new Date().toISOString(),
          priority: '1', // High priority
          isRead: false,
        };
        this.addNotification(notification);

        // Log details for debugging
        console.log('🔔 Low stock alert:', {
          count,
          items: items.map((item: any) => ({
            name: item.name,
            stock: item.stock_quantity,
            reorder_point: item.reorder_point
          }))
        });
      }
    } else if (ms?.message_type === 'payment_success') {
      const notification: Notification = {
        id: ms.id || `payment_${Date.now()}`,
        title: 'Thanh toán thành công',
        message: ms.message || 'Đã nhận thanh toán',
        time: ms.time || new Date().toISOString(),
        priority: '2',
        isRead: false,
      };
      this.addNotification(notification);
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
    this.playNotificationSound();
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
      life: 3000,
    });
  }

  private playNotificationSound(): void {
    if (!this.userSettings.notificationSound) {
      return;
    }

    // Sử dụng Web Audio API để tạo âm thanh notification không cần file MP3
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Tạo âm thanh notification (2 beep ngắn)
      const now = audioContext.currentTime;

      // Beep đầu tiên
      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

      // Beep thứ hai
      oscillator.frequency.setValueAtTime(1000, now + 0.15);
      gainNode.gain.setValueAtTime(0, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.16);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.25);

      oscillator.type = 'sine';
      oscillator.start(now);
      oscillator.stop(now + 0.35);
    } catch (error) {
      console.warn('Không thể phát âm thanh thông báo:', error);
    }
  }

  private initNotificationAudio(): void {
    // Không cần khởi tạo Audio element nữa vì sử dụng Web Audio API
    // Giữ lại để tương thích với code cũ nếu có
    this.notificationAudio = null;
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

  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SEARCH_HISTORY);
      this.searchHistory = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Không thể tải lịch sử tìm kiếm:', error);
      this.searchHistory = [];
    }
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Không thể lưu lịch sử tìm kiếm:', error);
    }
  }

  addToSearchHistory(query: string, type: string = 'general'): void {
    if (!query.trim()) return;

    const newItem: SearchHistory = {
      id: `${Date.now()}`,
      query: query.trim(),
      type,
      timestamp: Date.now(),
    };

    this.searchHistory = this.searchHistory.filter((item) => item.query !== query);
    this.searchHistory.unshift(newItem);

    if (this.searchHistory.length > this.MAX_SEARCH_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_SEARCH_HISTORY);
    }

    this.saveSearchHistory();
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    localStorage.removeItem(this.STORAGE_KEYS.SEARCH_HISTORY);
  }

  private loadUserProfile(): void {
    this.service.getUserProfile().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.userProfile = rs.response || {};
        }
      },
      (error: any) => {
        console.error('Lỗi khi tải thông tin người dùng:', error);
      }
    );
  }

  private loadUserSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.USER_SETTINGS);
      if (stored) {
        this.userSettings = { ...this.userSettings, ...JSON.parse(stored) };
        this.applyDarkMode();
      }
    } catch (error) {
      console.warn('Không thể tải cài đặt:', error);
    }
  }

  private saveUserSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.USER_SETTINGS, JSON.stringify(this.userSettings));
    } catch (error) {
      console.warn('Không thể lưu cài đặt:', error);
    }
  }

  toggleDarkMode(): void {
    this.userSettings.darkMode = !this.userSettings.darkMode;
    this.applyDarkMode();
    this.saveUserSettings();
  }

  private applyDarkMode(): void {
    if (this.userSettings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleNotificationSound(): void {
    this.userSettings.notificationSound = !this.userSettings.notificationSound;
    this.saveUserSettings();

    if (this.userSettings.notificationSound) {
      this.playNotificationSound();
    }
  }

  toggleDesktopNotifications(): void {
    this.userSettings.desktopNotifications = !this.userSettings.desktopNotifications;
    this.saveUserSettings();
  }

  toggleEmailNotifications(): void {
    this.userSettings.emailNotifications = !this.userSettings.emailNotifications;
    this.saveUserSettings();
  }

  openNotificationDrawer() {
    this.notificationVisible = true;
    this.addAttribute();
  }

  openSettings() {
    this.settingsVisible = true;
  }

  openSearch() {
    this.searchVisible = true;
    // Focus vào input sau khi dialog mở
    setTimeout(() => {
      if (this.searchInputRef) {
        this.searchInputRef.nativeElement.focus();
      }
    }, 100);
  }

  closeSearch() {
    this.searchVisible = false;
    this.searchQuery = '';
  }

  clearSearchInput() {
    this.searchQuery = '';
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.focus();
    }
  }

  onSearchDialogHide() {
    this.searchQuery = '';
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
      this.addToSearchHistory(this.searchQuery, 'search');
      console.log('Tìm kiếm:', this.searchQuery);
      this.performSearch(this.searchQuery);
      this.closeSearch();
    }
  }

  performSearch(query: string): void {
    this.service.quickSearch(query).subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          const results = rs.response;
          if (
            results.products?.length > 0 ||
            results.orders?.length > 0 ||
            results.customers?.length > 0
          ) {
            console.log('Kết quả tìm kiếm:', results);
          } else {
            this.message.add({
              severity: 'info',
              summary: 'Thông báo',
              detail: 'Không tìm thấy kết quả',
              life: 3000,
            });
          }
        }
      },
      (error: any) => {
        this.message.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Lỗi tìm kiếm',
          life: 3000,
        });
      }
    );
  }

  selectFromHistory(item: SearchHistory): void {
    this.searchQuery = item.query;
    this.handleSearch();
  }

  navigateToPayOS(): void {
    const payosUrl = 'https://my.payos.vn/d7ecd9f4a37f11f08d570242ac110002/dashboard';
    window.open(payosUrl, '_blank');
  }
}
