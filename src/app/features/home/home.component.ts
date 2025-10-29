import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
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

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
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
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    ButtonModule,
    CommonModule,
    ChartModule,
    CardModule,
    TableModule,
    TagModule,
    SelectModule,
    FormsModule,
    ToastModule,
  ],
  providers: [MessageService],
})
export class HomeComponent implements OnInit {
  readonly Math = Math;

  selectedPeriod: string = 'today';
  periodOptions = [
    { label: 'Hôm nay', value: 'today' },
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
  ];

  comparisonPeriod: string = 'hôm qua';
  loading: boolean = false;

  todayRevenue: number = 0;
  todayOrders: number = 0;
  todayProfit: number = 0;
  todayCustomers: number = 0;
  newCustomers: number = 0;
  profitMargin: number = 0;

  revenueGrowth: number = 0;
  orderGrowth: number = 0;
  profitGrowth: number = 0;
  customerGrowth: number = 0;

  revenueComparison: number = 0;
  orderComparison: number = 0;

  recentSales: RecentSale[] = [];
  topProducts: TopProduct[] = [];

  revenueChartData: any;
  revenueChartOptions: any;

  categoryChartData: any;
  pieChartOptions: any;

  constructor(private service: Service, private message: MessageService, private router: Router) {}

  ngOnInit() {
    this.initializeChartOptions();
    this.loadDashboardData();
  }

  private initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.revenueChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        filler: {
          propagate: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: { size: 11 },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
            font: { size: 11 },
            callback: (value: any) => `${(value / 1000000).toFixed(1)}M`,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
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
            color: textColor,
            font: { size: 12 },
            usePointStyle: true,
            padding: 15,
          },
        },
      },
    };
  }

  private loadDashboardData(): void {
    this.loading = true;

    this.service.getDashboardData(this.selectedPeriod).subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.processDashboardData(rs.response);
          this.initializeCharts();
        } else {
          this.showError('Không thể tải dữ liệu dashboard');
        }
      },
      (error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      }
    );
  }

  private processDashboardData(data: DashboardData): void {
    this.todayRevenue = data.today_revenue || 0;
    this.todayOrders = data.today_orders || 0;
    this.todayProfit = data.today_profit || 0;
    this.todayCustomers = data.today_customers || 0;
    this.newCustomers = data.new_customers || 0;
    this.profitMargin = data.profit_margin || 0;

    this.revenueGrowth = data.revenue_growth || 0;
    this.orderGrowth = data.order_growth || 0;
    this.profitGrowth = data.profit_growth || 0;
    this.customerGrowth = data.customer_growth || 0;

    this.revenueComparison = data.revenue_comparison || 0;
    this.orderComparison = data.order_comparison || 0;

    this.recentSales = data.recent_sales || [];
    this.topProducts = data.top_products || [];

    this.updateComparisonPeriod();
  }

  private updateComparisonPeriod(): void {
    switch (this.selectedPeriod) {
      case 'today':
        this.comparisonPeriod = 'hôm qua';
        break;
      case 'week':
        this.comparisonPeriod = 'tuần trước';
        break;
      case 'month':
        this.comparisonPeriod = 'tháng trước';
        break;
      default:
        this.comparisonPeriod = 'trước đó';
    }
  }

  private initializeCharts(): void {
    this.initRevenueChart();
    this.initCategoryChart();
  }

  private initRevenueChart(): void {
    const labels = this.recentSales.map((sale) =>
      new Date(sale.created_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );

    const data = this.recentSales.map((sale) => sale.amount / 1000000);

    this.revenueChartData = {
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data,
          fill: true,
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: '#22c55e',
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  }

  private initCategoryChart(): void {
    const labels = this.topProducts.slice(0, 5).map((p) => p.name);

    const data = this.topProducts.slice(0, 5).map((p) => p.revenue);

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    this.categoryChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => c.replace('1', '0.8')),
        },
      ],
    };
  }

  onPeriodChange(): void {
    this.loadDashboardData();
  }

  refreshData(): void {
    this.loadDashboardData();
    this.showSuccess('Đã cập nhật dữ liệu');
  }

  exportReport(): void {
    try {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const periodLabel =
        this.periodOptions.find((p) => p.value === this.selectedPeriod)?.label ||
        this.selectedPeriod;

      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      const headerStyle = {
        fill: { fgColor: { rgb: 'FFD966' } },
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const applyHeaderStyle = (ws: XLSX.WorkSheet) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = headerStyle;
        }
      };

      const overviewData = [
        { 'Chỉ số': 'Doanh thu', 'Giá trị': this.todayRevenue },
        { 'Chỉ số': 'Đơn hàng', 'Giá trị': this.todayOrders },
        { 'Chỉ số': 'Lợi nhuận', 'Giá trị': this.todayProfit },
        { 'Chỉ số': 'Khách hàng', 'Giá trị': this.todayCustomers },
        { 'Chỉ số': 'Khách hàng mới', 'Giá trị': this.newCustomers },
        {
          'Chỉ số': 'Tỷ suất lợi nhuận (%)',
          'Giá trị': this.profitMargin.toFixed(1),
        },
      ];
      const ws_overview: XLSX.WorkSheet = XLSX.utils.json_to_sheet(overviewData);
      ws_overview['!cols'] = [{ wch: 20 }, { wch: 18 }];
      applyHeaderStyle(ws_overview);
      XLSX.utils.book_append_sheet(wb, ws_overview, 'Tổng quan');

      if (this.recentSales && this.recentSales.length > 0) {
        const salesData = this.recentSales.map((sale, index) => ({
          STT: index + 1,
          'Mã đơn': sale.order_code,
          'Thời gian': new Date(sale.created_at).toLocaleString('vi-VN'),
          'Khách hàng': sale.buyer_name || 'Khách lẻ',
          'Số tiền (VNĐ)': sale.amount,
          'Thanh toán': this.getPaymentMethod(sale.status),
          'Trạng thái': this.getStatusLabel(sale.status),
        }));
        const ws_sales: XLSX.WorkSheet = XLSX.utils.json_to_sheet(salesData);
        ws_sales['!cols'] = [
          { wch: 5 },
          { wch: 20 },
          { wch: 20 },
          { wch: 25 },
          { wch: 18 },
          { wch: 15 },
          { wch: 15 },
        ];
        applyHeaderStyle(ws_sales);
        XLSX.utils.book_append_sheet(wb, ws_sales, 'Đơn hàng gần đây');
      }

      if (this.topProducts && this.topProducts.length > 0) {
        const productsData = this.topProducts.map((product, index) => ({
          STT: index + 1,
          'Tên sản phẩm': product.name,
          'Số lượng đã bán': product.quantity,
          'Doanh thu (VNĐ)': product.revenue,
        }));
        const ws_products: XLSX.WorkSheet = XLSX.utils.json_to_sheet(productsData);
        ws_products['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
        applyHeaderStyle(ws_products);
        XLSX.utils.book_append_sheet(wb, ws_products, 'Sản phẩm bán chạy');
      }

      const fileName = `Bao_cao_Dashboard_${periodLabel}_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.showSuccess('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Lỗi khi xuất báo cáo Excel:', error);
      this.showError('Xuất báo cáo thất bại');
    }
  }

  viewAllSales(): void {
    this.navigateTo('/page/sell');
  }

  viewAllProducts(): void {
    this.navigateTo('/page/products');
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Khác';
    }
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warn';
      case 'cancelled':
        return 'danger';
      default:
        return 'info';
    }
  }

  getPaymentMethod(status: string): string {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ xác nhận';
      default:
        return 'Khác';
    }
  }

  private showSuccess(message: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: message,
      life: 3000,
    });
  }

  private showError(message: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: message,
      life: 3000,
    });
  }
}
