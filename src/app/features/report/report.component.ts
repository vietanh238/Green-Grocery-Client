import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';

interface TopProduct {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders?: number;
}

interface ReportSummary {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
}

interface ReportGrowth {
  revenue: number;
  profit: number;
  order: number;
  margin: number;
}

interface ReportComparison {
  revenue: number;
  profit: number;
  order: number;
}

@Component({
  selector: 'app-report',
  standalone: true,
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ChartModule,
    CardModule,
    TableModule,
    SelectModule,
    ToastModule,
    TabsModule,
    TagModule,
  ],
  providers: [MessageService],
})
export class ReportComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  private subscriptions = new Subscription();
  private periodChange$ = new Subject<void>();

  selectedPeriod: string = 'month';
  readonly periodOptions = [
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
    { label: 'Năm nay', value: 'year' },
    { label: 'Tùy chỉnh', value: 'custom' },
  ];

  customDateFrom: string = '';
  customDateTo: string = '';
  showCustomDate: boolean = false;
  loading: boolean = false;
  exporting: boolean = false;

  summary: ReportSummary = {
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    profitMargin: 0,
  };

  growth: ReportGrowth = {
    revenue: 0,
    profit: 0,
    order: 0,
    margin: 0,
  };

  comparison: ReportComparison = {
    revenue: 0,
    profit: 0,
    order: 0,
  };

  topProducts: TopProduct[] = [];
  monthlyRevenueData: MonthlyRevenue[] = [];

  revenueChartData: any;
  profitChartData: any;
  topProductsChartData: any;

  commonChartOptions: any;
  pieChartOptions: any;

  constructor(
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeChartOptions();
    this.initializePeriodDebounce();
    this.loadReportData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializePeriodDebounce(): void {
    const sub = this.periodChange$
      .pipe(debounceTime(300))
      .subscribe(() => this.loadReportData());

    this.subscriptions.add(sub);
  }

  private initializeChartOptions(): void {
    const textColor = '#1f2937';
    const textColorSecondary = '#6b7280';
    const surfaceBorder = '#e5e7eb';

    this.commonChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            font: { size: 12 },
          },
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
            callback: (value: any) => this.formatChartValue(value),
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
          position: 'right',
          labels: {
            color: textColor,
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
              return `${label}: ${value.toFixed(2)}M đ`;
            },
          },
        },
      },
    };
  }

  private formatChartValue(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}B`;
    }
    return `${value}M`;
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.showCustomDate = true;
    } else {
      this.showCustomDate = false;
      this.customDateFrom = '';
      this.customDateTo = '';
      this.periodChange$.next();
    }
  }

  onDateRangeSelect(): void {
    if (this.customDateFrom && this.customDateTo) {
      if (this.customDateFrom > this.customDateTo) {
        this.showNotification('error', 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
        return;
      }
      this.loadReportData();
    }
  }

  private loadReportData(): void {
    this.loading = true;

    const params = this.buildRequestParams();

    const sub = this.service
      .getBusinessReport(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rs: any) => {
          if (rs.status === ConstantDef.STATUS_SUCCESS) {
            this.processReportData(rs.response);
            this.updateCharts();
          } else {
            this.showNotification('error', rs.response?.error_message_vn || 'Không thể tải báo cáo');
          }
        },
        error: (error: any) => {
          console.error('Report loading error:', error);
          this.showNotification('error', 'Lỗi hệ thống khi tải báo cáo');
        },
      });

    this.subscriptions.add(sub);
  }

  private buildRequestParams(): any {
    if (this.selectedPeriod === 'custom') {
      return {
        period: 'custom',
        date_from: this.customDateFrom,
        date_to: this.customDateTo,
      };
    }
    return { period: this.selectedPeriod };
  }

  private processReportData(data: any): void {
    this.summary = {
      totalRevenue: data.total_revenue || 0,
      totalProfit: data.total_profit || 0,
      totalOrders: data.orders_count || 0,
      profitMargin: data.profit_margin || 0,
    };

    this.growth = {
      revenue: data.revenue_growth || 0,
      profit: data.profit_growth || 0,
      order: data.order_growth || 0,
      margin: data.margin_growth || 0,
    };

    this.comparison = {
      revenue: data.revenue_comparison || 0,
      profit: data.profit_comparison || 0,
      order: data.order_comparison || 0,
    };

    this.topProducts = data.top_products || [];
    this.monthlyRevenueData = data.monthly_revenue || [];
  }

  private updateCharts(): void {
    this.updateRevenueChart();
    this.updateProfitChart();
    this.updateTopProductsChart();
  }

  private updateRevenueChart(): void {
    if (this.monthlyRevenueData.length === 0) {
      this.revenueChartData = this.getEmptyChartData('Doanh thu (M đ)');
      return;
    }

    const labels = this.monthlyRevenueData.map((item) => item.month);
    const data = this.monthlyRevenueData.map((item) => item.revenue / 1000000);

    this.revenueChartData = {
      labels,
      datasets: [
        {
          label: 'Doanh thu (M đ)',
          data,
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

  private updateProfitChart(): void {
    if (this.monthlyRevenueData.length === 0) {
      this.profitChartData = this.getEmptyChartData('Lợi nhuận (M đ)');
      return;
    }

    const labels = this.monthlyRevenueData.map((item) => item.month);
    const profitData = this.monthlyRevenueData.map((item) => {
      const profit = this.summary.totalProfit / this.monthlyRevenueData.length;
      return profit / 1000000;
    });

    this.profitChartData = {
      labels,
      datasets: [
        {
          label: 'Lợi nhuận (M đ)',
          data: profitData,
          backgroundColor: '#16a34a',
          borderColor: '#16a34a',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: '#15803d',
        },
      ],
    };
  }

  private updateTopProductsChart(): void {
    if (this.topProducts.length === 0) {
      this.topProductsChartData = this.getEmptyChartData('Sản phẩm');
      return;
    }

    const topFive = this.topProducts.slice(0, 5);
    const labels = topFive.map((item) => item.name);
    const data = topFive.map((item) => item.revenue / 1000000);

    const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    const hoverColors = ['#15803d', '#2563eb', '#d97706', '#db2777', '#7c3aed'];

    this.topProductsChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          borderWidth: 0,
        },
      ],
    };
  }

  private getEmptyChartData(label: string): any {
    return {
      labels: ['Không có dữ liệu'],
      datasets: [
        {
          label,
          data: [0],
          backgroundColor: '#e5e7eb',
          borderColor: '#d1d5db',
        },
      ],
    };
  }

  exportExcel(): void {
    if (!this.topProducts.length && this.summary.totalRevenue === 0) {
      this.showNotification('warn', 'Không có dữ liệu để xuất');
      return;
    }

    this.exporting = true;

    setTimeout(() => {
      try {
        const wb: XLSX.WorkBook = XLSX.utils.book_new();

        this.addSummarySheet(wb);

        if (this.topProducts.length > 0) {
          this.addTopProductsSheet(wb);
        }

        if (this.monthlyRevenueData.length > 0) {
          this.addMonthlyRevenueSheet(wb);
        }

        const fileName = `BaoCao_KinhDoanh_${this.formatDateForFile()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        this.showNotification('success', `Đã xuất báo cáo: ${fileName}`);
      } catch (error) {
        console.error('Export error:', error);
        this.showNotification('error', 'Có lỗi khi xuất file Excel');
      } finally {
        this.exporting = false;
      }
    }, 100);
  }

  private addSummarySheet(wb: XLSX.WorkBook): void {
    const summaryData = [
      { 'Chỉ tiêu': 'Tổng doanh thu', 'Giá trị': `${(this.summary.totalRevenue).toLocaleString('vi-VN')} đ` },
      { 'Chỉ tiêu': 'Tổng lợi nhuận', 'Giá trị': `${(this.summary.totalProfit).toLocaleString('vi-VN')} đ` },
      { 'Chỉ tiêu': 'Tổng đơn hàng', 'Giá trị': this.summary.totalOrders },
      { 'Chỉ tiêu': 'Tỷ suất lợi nhuận', 'Giá trị': `${this.summary.profitMargin.toFixed(2)}%` },
      { 'Chỉ tiêu': '', 'Giá trị': '' },
      { 'Chỉ tiêu': 'Tăng trưởng doanh thu', 'Giá trị': `${this.growth.revenue.toFixed(1)}%` },
      { 'Chỉ tiêu': 'Tăng trưởng lợi nhuận', 'Giá trị': `${this.growth.profit.toFixed(1)}%` },
      { 'Chỉ tiêu': 'Tăng trưởng đơn hàng', 'Giá trị': `${this.growth.order.toFixed(1)}%` },
    ];

    const ws = XLSX.utils.json_to_sheet(summaryData);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan');
  }

  private addTopProductsSheet(wb: XLSX.WorkBook): void {
    if (this.topProducts.length === 0) return;

    const productsData = this.topProducts.map((product, index) => ({
      'STT': index + 1,
      'Tên sản phẩm': product.name,
      'SKU': product.sku,
      'Số lượng': product.quantity,
      'Doanh thu': `${(product.revenue).toLocaleString('vi-VN')} đ`,
    }));

    const ws = XLSX.utils.json_to_sheet(productsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Top sản phẩm');
  }

  private addMonthlyRevenueSheet(wb: XLSX.WorkBook): void {
    if (this.monthlyRevenueData.length === 0) return;

    const monthlyData = this.monthlyRevenueData.map((data, index) => ({
      'STT': index + 1,
      'Tháng': data.month,
      'Doanh thu': `${(data.revenue).toLocaleString('vi-VN')} đ`,
      'Số đơn hàng': data.orders || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(monthlyData);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu theo tháng');
  }

  private formatDateForFile(): string {
    return new Date().toISOString().slice(0, 10);
  }

  printReport(): void {
    window.print();
  }

  refreshData(): void {
    this.loadReportData();
  }

  private showNotification(severity: 'success' | 'error' | 'warn', detail: string): void {
    const summaryMap: Record<string, string> = {
      success: 'Thành công',
      error: 'Lỗi',
      warn: 'Cảnh báo',
    };

    this.message.add({
      severity,
      summary: summaryMap[severity],
      detail,
      life: 3000,
    });
  }
}
