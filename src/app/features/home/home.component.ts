import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import * as XLSX from 'xlsx';

interface RecentSale {
  order_code: string;
  created_at: string;
  buyer_name: string;
  amount: number;
  status: string;
}

interface Activity {
  type: 'sale' | 'low_stock' | 'new_customer' | 'milestone';
  title: string;
  description: string;
  time: string;
  icon: string;
  color: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface InventoryStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  overstock_count: number;
  total_stock_value: number;
  alert_level: 'normal' | 'warning' | 'critical';
}

interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  reorder_point: number;
  unit: string;
  category: string;
  status: 'out_of_stock' | 'low_stock';
  urgency: 'critical' | 'high' | 'medium';
}

interface DashboardData {
  today_revenue: number;
  today_orders: number;
  today_profit: number;
  today_customers: number;
  new_customers: number;
  profit_margin: number;
  revenue_growth: number;
  order_growth: number;
  profit_growth: number;
  customer_growth: number;
  revenue_comparison: number;
  order_comparison: number;
  recent_sales: RecentSale[];
  top_products: TopProduct[];
  hourly_revenue: any[];
  category_revenue: any[];
  inventory_stats?: InventoryStats;
  low_stock_products?: LowStockProduct[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ChartModule,
    CardModule,
    TableModule,
    TagModule,
    SelectModule,
    ToastModule,
  ],
  providers: [MessageService],
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  private subscriptions = new Subscription();
  private periodChange$ = new Subject<string>();

  selectedPeriod = 'today';
  readonly periodOptions = [
    { label: 'Hôm nay', value: 'today' },
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
  ];

  comparisonPeriod = 'hôm qua';
  loading = false;
  exporting = false;

  todayRevenue = 0;
  todayOrders = 0;
  todayProfit = 0;
  todayCustomers = 0;
  newCustomers = 0;
  profitMargin = 0;

  revenueGrowth = 0;
  orderGrowth = 0;
  profitGrowth = 0;
  customerGrowth = 0;

  revenueComparison = 0;
  orderComparison = 0;

  recentSales: RecentSale[] = [];
  topProducts: TopProduct[] = [];
  inventoryStats: InventoryStats | null = null;
  lowStockProducts: LowStockProduct[] = [];
  recentActivities: Activity[] = [];

  revenueChartData: any;
  revenueChartOptions: any;
  categoryChartData: any;
  pieChartOptions: any;

  constructor(
    private service: Service,
    private message: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeChartOptions();
    this.loadDashboardData();
    this.setupPeriodChangeListener();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.periodChange$.complete();
  }

  private setupPeriodChangeListener(): void {
    const subscription = this.periodChange$
      .pipe(debounceTime(300))
      .subscribe(() => this.loadDashboardData());

    this.subscriptions.add(subscription);
  }

  private initializeChartOptions(): void {
    this.revenueChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `Doanh thu: ${this.formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
          },
          grid: {
            color: '#f3f4f6',
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
            callback: (value: any) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
              }
              return value;
            },
          },
          grid: {
            color: '#f3f4f6',
            drawBorder: false,
          },
          beginAtZero: true,
        },
      },
    };

    this.pieChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#1f2937',
            font: { size: 12 },
            usePointStyle: true,
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${this.formatCurrency(value)}`;
            },
          },
        },
      },
    };
  }

  private loadDashboardData(): void {
    if (this.loading) return;

    this.loading = true;

    const subscription = this.service
      .getDashboardData(this.selectedPeriod)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          if (response.status === ConstantDef.STATUS_SUCCESS) {
            try {
              this.processDashboardData(response.response);
              this.initializeCharts(response.response);
            } catch (error) {
              console.error('Error processing dashboard data:', error);
              this.showError('Lỗi khi xử lý dữ liệu dashboard');
            }
          } else {
            const errorMsg = response.response?.error_message_vn || response.response?.error_message_us || 'Không thể tải dữ liệu dashboard';
            this.showError(errorMsg);
          }
        },
        error: (error: any) => {
          console.error('Dashboard data error:', error);
          const errorMsg = error?.error?.response?.error_message_vn || error?.error?.response?.error_message_us || 'Lỗi kết nối khi tải dữ liệu';
          this.showError(errorMsg);
        },
      });

    this.subscriptions.add(subscription);
  }

  private processDashboardData(data: DashboardData): void {
    const {
      today_revenue = 0,
      today_orders = 0,
      today_profit = 0,
      today_customers = 0,
      new_customers = 0,
      profit_margin = 0,
      revenue_growth = 0,
      order_growth = 0,
      profit_growth = 0,
      customer_growth = 0,
      revenue_comparison = 0,
      order_comparison = 0,
      recent_sales = [],
      top_products = [],
      inventory_stats = null,
      low_stock_products = [],
    } = data || {};

    Object.assign(this, {
      todayRevenue: Number(today_revenue) || 0,
      todayOrders: Number(today_orders) || 0,
      todayProfit: Number(today_profit) || 0,
      todayCustomers: Number(today_customers) || 0,
      newCustomers: Number(new_customers) || 0,
      profitMargin: Number(profit_margin) || 0,
      revenueGrowth: Number(revenue_growth) || 0,
      orderGrowth: Number(order_growth) || 0,
      profitGrowth: Number(profit_growth) || 0,
      customerGrowth: Number(customer_growth) || 0,
      revenueComparison: Number(revenue_comparison) || 0,
      orderComparison: Number(order_comparison) || 0,
      recentSales: Array.isArray(recent_sales) ? recent_sales : [],
      topProducts: Array.isArray(top_products) ? top_products : [],
      inventoryStats: inventory_stats || null,
      lowStockProducts: Array.isArray(low_stock_products) ? low_stock_products : [],
    });

    this.generateActivities(data);
    this.updateComparisonPeriod();
  }

  private updateComparisonPeriod(): void {
    const periodMap: Record<string, string> = {
      today: 'hôm qua',
      week: 'tuần trước',
      month: 'tháng trước',
    };
    this.comparisonPeriod = periodMap[this.selectedPeriod] || 'trước đó';
  }

  private initializeCharts(data: DashboardData): void {
    this.initRevenueChart(data);
    this.initCategoryChart();
  }

  private updateChartData(data: DashboardData): void {
    if (this.revenueChartData) {
      const { labels, chartData } = this.prepareRevenueChartData(data);
      this.revenueChartData.labels = labels;
      this.revenueChartData.datasets[0].data = chartData;
      this.revenueChartData = { ...this.revenueChartData };
    } else {
      this.initRevenueChart(data);
    }

    if (this.categoryChartData && this.topProducts?.length) {
      const topFive = this.topProducts.slice(0, 5);
      this.categoryChartData.labels = topFive.map((p) => p.name);
      this.categoryChartData.datasets[0].data = topFive.map((p) => p.revenue);
      this.categoryChartData = { ...this.categoryChartData };
    } else {
      this.initCategoryChart();
    }
  }

  private initRevenueChart(data: DashboardData): void {
    const { labels, chartData } = this.prepareRevenueChartData(data);

    this.revenueChartData = {
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data: chartData,
          fill: true,
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          borderColor: '#16a34a',
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: '#16a34a',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }

  private prepareRevenueChartData(data: DashboardData): { labels: string[]; chartData: number[] } {
    if (data.hourly_revenue?.length) {
      return this.mapHourlyRevenueData(data.hourly_revenue);
    }

    if (this.recentSales?.length) {
      return this.aggregateSalesData(this.recentSales);
    }

    return this.getDefaultChartData();
  }

  private mapHourlyRevenueData(hourlyRevenue: any[]): { labels: string[]; chartData: number[] } {
    const labels = hourlyRevenue.map((item) => this.formatTimeLabel(item));
    const chartData = hourlyRevenue.map((item) => item.revenue || 0);
    return { labels, chartData };
  }

  private aggregateSalesData(sales: RecentSale[]): { labels: string[]; chartData: number[] } {
    const salesByTime = sales.reduce((acc, sale) => {
      const date = new Date(sale.created_at);
      const timeKey = this.getTimeKey(date);

      if (!acc[timeKey]) {
        acc[timeKey] = { amount: 0, sortOrder: this.getTimeSortOrder(date) };
      }
      acc[timeKey].amount += sale.amount;

      return acc;
    }, {} as Record<string, { amount: number; sortOrder: number }>);

    const sortedEntries = Object.entries(salesByTime).sort((a, b) => a[1].sortOrder - b[1].sortOrder);

    return {
      labels: sortedEntries.map(([key]) => key),
      chartData: sortedEntries.map(([, value]) => value.amount),
    };
  }

  private getTimeSortOrder(date: Date): number {
    if (this.selectedPeriod === 'today') {
      return date.getHours();
    }
    if (this.selectedPeriod === 'week') {
      return date.getDay();
    }
    return date.getDate();
  }

  private formatTimeLabel(item: any): string {
    if (this.selectedPeriod === 'today') {
      return `${item.hour}:00`;
    }
    if (this.selectedPeriod === 'week') {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return days[new Date(item.date).getDay()];
    }
    return new Date(item.date).getDate().toString();
  }

  private getTimeKey(date: Date): string {
    if (this.selectedPeriod === 'today') {
      return `${date.getHours()}:00`;
    }
    if (this.selectedPeriod === 'week') {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return days[date.getDay()];
    }
    return date.getDate().toString();
  }

  private getDefaultChartData(): { labels: string[]; chartData: number[] } {
    let labels: string[];

    if (this.selectedPeriod === 'today') {
      labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    } else if (this.selectedPeriod === 'week') {
      labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    } else {
      labels = Array.from({ length: 30 }, (_, i) => (i + 1).toString());
    }

    return { labels, chartData: new Array(labels.length).fill(0) };
  }

  private initCategoryChart(): void {
    if (!this.topProducts?.length) {
      this.categoryChartData = {
        labels: ['Chưa có dữ liệu'],
        datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }],
      };
      return;
    }

    const topFive = this.topProducts.slice(0, 5);
    const labels = topFive.map((p) => p.name);
    const data = topFive.map((p) => p.revenue);
    const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    this.categoryChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          hoverBackgroundColor: colors.slice(0, data.length).map((c) => this.adjustColor(c, -10)),
        },
      ],
    };
  }

  private adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  onPeriodChange(): void {
    this.periodChange$.next(this.selectedPeriod);
  }

  refreshData(): void {
    if (this.loading) return;

    this.loading = true;
    const subscription = this.service
      .getDashboardData(this.selectedPeriod)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          if (response.status === ConstantDef.STATUS_SUCCESS) {
            try {
              this.processDashboardData(response.response);
              this.updateChartData(response.response);
              this.showSuccess('Đã cập nhật dữ liệu');
            } catch (error) {
              console.error('Error refreshing dashboard data:', error);
              this.showError('Lỗi khi cập nhật dữ liệu');
            }
          } else {
            const errorMsg = response.response?.error_message_vn || response.response?.error_message_us || 'Không thể tải dữ liệu dashboard';
            this.showError(errorMsg);
          }
        },
        error: (error: any) => {
          console.error('Dashboard refresh error:', error);
          const errorMsg = error?.error?.response?.error_message_vn || error?.error?.response?.error_message_us || 'Lỗi kết nối khi làm mới dữ liệu';
          this.showError(errorMsg);
        },
      });

    this.subscriptions.add(subscription);
  }

  exportReport(): void {
    if (this.exporting) return;

    this.exporting = true;

    setTimeout(() => {
      try {
        const workbook = XLSX.utils.book_new();
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const periodLabel = this.periodOptions.find((p) => p.value === this.selectedPeriod)?.label || this.selectedPeriod;

        this.addOverviewSheet(workbook);
        this.addSalesSheet(workbook);
        this.addProductsSheet(workbook);

        const fileName = `Bao_cao_Dashboard_${periodLabel}_${timestamp}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        this.showSuccess('Xuất báo cáo Excel thành công');
      } catch (error) {
        console.error('Export report error:', error);
        this.showError('Không thể xuất báo cáo');
      } finally {
        this.exporting = false;
      }
    }, 100);
  }

  private addOverviewSheet(workbook: XLSX.WorkBook): void {
    const overviewData = [
      { 'Chỉ số': 'Doanh thu', 'Giá trị': this.todayRevenue },
      { 'Chỉ số': 'Đơn hàng', 'Giá trị': this.todayOrders },
      { 'Chỉ số': 'Lợi nhuận', 'Giá trị': this.todayProfit },
      { 'Chỉ số': 'Khách hàng', 'Giá trị': this.todayCustomers },
      { 'Chỉ số': 'Khách hàng mới', 'Giá trị': this.newCustomers },
      { 'Chỉ số': 'Tỷ suất lợi nhuận (%)', 'Giá trị': this.profitMargin.toFixed(1) },
    ];
    const worksheet = XLSX.utils.json_to_sheet(overviewData);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tổng quan');
  }

  private addSalesSheet(workbook: XLSX.WorkBook): void {
    if (!this.recentSales?.length) return;

    const salesData = this.recentSales.map((sale, index) => ({
      STT: index + 1,
      'Mã đơn': sale.order_code,
      'Thời gian': new Date(sale.created_at).toLocaleString('vi-VN'),
      'Khách hàng': sale.buyer_name || 'Khách lẻ',
      'Số tiền (VNĐ)': sale.amount,
      'Thanh toán': this.getPaymentMethod(sale.status),
      'Trạng thái': this.getStatusLabel(sale.status),
    }));

    const worksheet = XLSX.utils.json_to_sheet(salesData);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn hàng gần đây');
  }

  private addProductsSheet(workbook: XLSX.WorkBook): void {
    if (!this.topProducts?.length) return;

    const productsData = this.topProducts.map((product, index) => ({
      STT: index + 1,
      'Tên sản phẩm': product.name,
      'Số lượng đã bán': product.quantity,
      'Doanh thu (VNĐ)': product.revenue,
    }));

    const worksheet = XLSX.utils.json_to_sheet(productsData);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản phẩm bán chạy');
  }

  viewAllSales(): void {
    this.router.navigate(['/page/history']);
  }

  viewAllProducts(): void {
    this.navigateTo('/page/products');
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      paid: 'Đã thanh toán',
      pending: 'Chờ thanh toán',
      cancelled: 'Đã hủy',
    };
    return statusMap[status] || 'Khác';
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    const severityMap: Record<string, 'success' | 'warn' | 'danger' | 'info'> = {
      paid: 'success',
      pending: 'warn',
      cancelled: 'danger',
    };
    return severityMap[status] || 'info';
  }

  getPaymentMethod(status: string): string {
    const methodMap: Record<string, string> = {
      paid: 'Đã thanh toán',
      pending: 'Chờ xác nhận',
    };
    return methodMap[status] || 'Khác';
  }

  private showSuccess(message: string): void {
    this.showNotification('success', 'Thành công', message);
  }

  private showError(message: string): void {
    this.showNotification('error', 'Lỗi', message);
  }

  private showNotification(severity: 'success' | 'error' | 'info', summary: string, detail: string): void {
    this.message.add({
      severity,
      summary,
      detail,
      life: severity === 'error' ? 5000 : 3000,
    });
  }

  getUrgencySeverity(urgency: string): 'success' | 'warn' | 'danger' | 'info' {
    const severityMap: Record<string, 'success' | 'warn' | 'danger' | 'info'> = {
      critical: 'danger',
      high: 'warn',
      medium: 'info',
    };
    return severityMap[urgency] || 'success';
  }

  getUrgencyLabel(urgency: string): string {
    const labelMap: Record<string, string> = {
      critical: 'Khẩn cấp',
      high: 'Cao',
      medium: 'Trung bình',
    };
    return labelMap[urgency] || 'Thấp';
  }

  getAlertIcon(alertLevel: string): string {
    const iconMap: Record<string, string> = {
      critical: 'pi-exclamation-triangle',
      warning: 'pi-exclamation-circle',
    };
    return iconMap[alertLevel] || 'pi-check-circle';
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/page/products'], { queryParams: { id: productId } });
  }

  viewAllInventory(): void {
    this.router.navigate(['/page/products'], { queryParams: { filter: 'low_stock' } });
  }

  private generateActivities(data: DashboardData): void {
    const activities: Activity[] = [];

    activities.push(...this.generateSaleActivities(data.recent_sales));
    activities.push(...this.generateLowStockActivities(data.low_stock_products));
    activities.push(...this.generateMilestoneActivities(data.today_orders));

    this.recentActivities = activities.slice(0, 5);
  }

  private generateSaleActivities(sales: RecentSale[] = []): Activity[] {
    return sales.slice(0, 3).map((sale) => ({
      type: 'sale' as const,
      title: 'Đơn hàng mới',
      description: `${sale.buyer_name || 'Khách lẻ'} - ${this.formatCurrency(sale.amount)}`,
      time: this.getTimeAgo(sale.created_at),
      icon: 'pi-shopping-cart',
      color: '#16a34a',
    }));
  }

  private generateLowStockActivities(lowStockProducts: LowStockProduct[] = []): Activity[] {
    const criticalProducts = lowStockProducts.filter((p) => p.urgency === 'critical');

    if (!criticalProducts.length) return [];

    return [
      {
        type: 'low_stock' as const,
        title: 'Cảnh báo tồn kho',
        description: `${criticalProducts.length} sản phẩm hết hàng`,
        time: 'Vừa xong',
        icon: 'pi-exclamation-triangle',
        color: '#ef4444',
      },
    ];
  }

  private generateMilestoneActivities(todayOrders: number): Activity[] {
    if (todayOrders <= 0) return [];

    const milestones = [10, 20, 50, 100, 200, 250, 500, 750, 1000, 2000, 5000];
    const achievedMilestone = milestones
      .reverse()
      .find((milestone) => todayOrders >= milestone && todayOrders <= milestone + 5);

    if (!achievedMilestone) return [];

    const getMilestoneIcon = (orders: number): string => {
      if (orders >= 1000) return 'pi-trophy';
      if (orders >= 500) return 'pi-star-fill';
      if (orders >= 100) return 'pi-bolt';
      return 'pi-check-circle';
    };

    const getMilestoneColor = (orders: number): string => {
      if (orders >= 1000) return '#eab308';
      if (orders >= 500) return '#f59e0b';
      if (orders >= 100) return '#3b82f6';
      return '#16a34a';
    };

    return [
      {
        type: 'milestone' as const,
        title: 'Cột mốc đạt được',
        description: `Chúc mừng! Đã hoàn thành ${achievedMilestone} đơn hàng`,
        time: 'Vừa xong',
        icon: getMilestoneIcon(achievedMilestone),
        color: getMilestoneColor(achievedMilestone),
      },
    ];
  }

  private getTimeAgo(dateString: string): string {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'Không xác định';
    }

    const now = new Date();
    const utcDate = new Date(date.toISOString());
    const utcNow = new Date(now.toISOString());

    const diffMs = utcNow.getTime() - utcDate.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
    const diffDays = Math.floor(Math.abs(diffMs) / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
