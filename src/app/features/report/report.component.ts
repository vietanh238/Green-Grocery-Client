import { Component, OnInit } from '@angular/core';
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

interface ReportData {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

interface CategoryData {
  category: string;
  revenue: number;
  percentage: number;
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
export class ReportComponent implements OnInit {
  selectedPeriod: any = { label: 'Tháng này', value: 'month' };
  periodOptions = [
    { label: 'Hôm nay', value: 'today' },
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
    { label: 'Quý này', value: 'quarter' },
    { label: 'Năm nay', value: 'year' },
    { label: 'Tùy chỉnh', value: 'custom' },
  ];

  dateRange: Date[] = [];
  showCustomDate: boolean = false;

  totalRevenue: number = 285000000;
  totalProfit: number = 78500000;
  totalOrders: number = 856;
  profitMargin: number = 27.5;

  revenueChartData: any;
  revenueChartOptions: any;

  profitChartData: any;
  profitChartOptions: any;

  categoryChartData: any;
  categoryChartOptions: any;

  comparisonChartData: any;
  comparisonChartOptions: any;

  reportData: ReportData[] = [];
  topProducts: TopProduct[] = [];
  categoryData: CategoryData[] = [];

  loading: boolean = false;

  constructor(private message: MessageService) {}

  ngOnInit() {
    this.loadMockData();
    this.initCharts();
  }

  loadMockData() {
    this.reportData = [
      {
        period: '01/10/2025',
        revenue: 8500000,
        cost: 6200000,
        profit: 2300000,
        orders: 25,
      },
      {
        period: '02/10/2025',
        revenue: 9200000,
        cost: 6700000,
        profit: 2500000,
        orders: 28,
      },
      {
        period: '03/10/2025',
        revenue: 7800000,
        cost: 5600000,
        profit: 2200000,
        orders: 22,
      },
      {
        period: '04/10/2025',
        revenue: 10500000,
        cost: 7500000,
        profit: 3000000,
        orders: 32,
      },
      {
        period: '05/10/2025',
        revenue: 9800000,
        cost: 7100000,
        profit: 2700000,
        orders: 29,
      },
    ];

    this.topProducts = [
      {
        name: 'Gạo ST25 5kg',
        quantity: 125,
        revenue: 18750000,
        profit: 3750000,
      },
      {
        name: 'Dầu ăn Neptune 1L',
        quantity: 98,
        revenue: 2450000,
        profit: 490000,
      },
      {
        name: 'Nước ngọt Coca Cola 330ml',
        quantity: 456,
        revenue: 4560000,
        profit: 1368000,
      },
      {
        name: 'Mì Hảo Hảo tôm chua cay',
        quantity: 678,
        revenue: 2712000,
        profit: 813600,
      },
      {
        name: 'Sữa tươi Vinamilk 1L',
        quantity: 234,
        revenue: 7020000,
        profit: 2106000,
      },
    ];

    this.categoryData = [
      { category: 'Thực phẩm khô', revenue: 95000000, percentage: 33.3 },
      { category: 'Đồ uống', revenue: 71000000, percentage: 24.9 },
      { category: 'Gia vị', revenue: 57000000, percentage: 20.0 },
      { category: 'Đồ ăn vặt', revenue: 42750000, percentage: 15.0 },
      { category: 'Khác', revenue: 19250000, percentage: 6.8 },
    ];
  }

  initCharts() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.revenueChartData = {
      labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      datasets: [
        {
          label: 'Doanh thu',
          data: [25, 28, 32, 29, 35, 38, 42, 40, 45, 48, 52, 55],
          fill: true,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: '#22c55e',
          tension: 0.4,
        },
      ],
    };

    this.revenueChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function (value: any) {
              return value + 'M';
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
      },
    };

    this.profitChartData = {
      labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      datasets: [
        {
          label: 'Lợi nhuận',
          data: [6.5, 7.2, 8.5, 7.8, 9.2, 10.1, 11.5, 10.8, 12.3, 13.1, 14.2, 15.0],
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 2,
        },
      ],
    };

    this.profitChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function (value: any) {
              return value + 'M';
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
      },
    };

    this.categoryChartData = {
      labels: ['Thực phẩm khô', 'Đồ uống', 'Gia vị', 'Đồ ăn vặt', 'Khác'],
      datasets: [
        {
          data: [33.3, 24.9, 20.0, 15.0, 6.8],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
          hoverBackgroundColor: ['#16a34a', '#2563eb', '#d97706', '#db2777', '#7c3aed'],
        },
      ],
    };

    this.categoryChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
      },
    };

    this.comparisonChartData = {
      labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
      datasets: [
        {
          label: 'Tháng này',
          data: [65, 72, 68, 80],
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: 'Tháng trước',
          data: [58, 65, 62, 70],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
      ],
    };

    this.comparisonChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function (value: any) {
              return value + 'M';
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
      },
    };
  }

  onPeriodChange() {
    if (this.selectedPeriod.value === 'custom') {
      this.showCustomDate = true;
    } else {
      this.showCustomDate = false;
      this.loadReportData();
    }
  }

  onDateRangeSelect() {
    if (this.dateRange && this.dateRange.length === 2) {
      this.loadReportData();
    }
  }

  loadReportData() {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.message.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã tải báo cáo',
        life: 2000,
      });
    }, 500);
  }

  exportPDF() {
    this.message.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: 'Đang xuất báo cáo PDF...',
      life: 3000,
    });
  }

  exportExcel() {
    this.message.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: 'Đang xuất báo cáo Excel...',
      life: 3000,
    });
  }

  printReport() {
    this.message.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: 'Đang chuẩn bị in báo cáo...',
      life: 3000,
    });
  }

  calculateProfitMargin(revenue: number, profit: number): number {
    return revenue > 0 ? (profit / revenue) * 100 : 0;
  }

  getMarginSeverity(margin: number): string {
    if (margin >= 30) return 'success';
    if (margin >= 20) return 'info';
    if (margin >= 10) return 'warn';
    return 'danger';
  }
}
