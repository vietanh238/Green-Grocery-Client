import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

interface Sale {
  id: string;
  time: string;
  customer: string;
  amount: number;
  payment: string;
  status: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
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
  ],
})
export class HomeComponent implements OnInit {
  todayRevenue: number = 15750000;
  todayOrders: number = 47;
  todayProfit: number = 4250000;
  todayCustomers: number = 38;

  selectedPeriod: any = { label: 'Hôm nay', value: 'today' };
  periodOptions = [
    { label: 'Hôm nay', value: 'today' },
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
  ];

  recentSales: Sale[] = [
    {
      id: 'HD001',
      time: '14:30',
      customer: 'Nguyễn Văn A',
      amount: 450000,
      payment: 'Tiền mặt',
      status: 'completed',
    },
    {
      id: 'HD002',
      time: '13:45',
      customer: 'Trần Thị B',
      amount: 280000,
      payment: 'Chuyển khoản',
      status: 'completed',
    },
    {
      id: 'HD003',
      time: '12:20',
      customer: 'Lê Văn C',
      amount: 670000,
      payment: 'Tiền mặt',
      status: 'completed',
    },
    {
      id: 'HD004',
      time: '11:15',
      customer: 'Phạm Thị D',
      amount: 320000,
      payment: 'Ví điện tử',
      status: 'pending',
    },
    {
      id: 'HD005',
      time: '10:30',
      customer: 'Hoàng Văn E',
      amount: 550000,
      payment: 'Tiền mặt',
      status: 'completed',
    },
  ];

  topProducts: TopProduct[] = [
    { name: 'Mì Hảo Hảo tôm chua cay', quantity: 45, revenue: 180000 },
    { name: 'Nước ngọt Coca Cola 330ml', quantity: 38, revenue: 380000 },
    { name: 'Gạo ST25 5kg', quantity: 12, revenue: 1800000 },
    { name: 'Dầu ăn Neptune 1L', quantity: 25, revenue: 625000 },
    { name: 'Sữa tươi Vinamilk 1L', quantity: 30, revenue: 900000 },
  ];

  revenueChartData: any;
  revenueChartOptions: any;

  categoryChartData: any;
  categoryChartOptions: any;

  ngOnInit() {
    this.initRevenueChart();
    this.initCategoryChart();
  }

  initRevenueChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.revenueChartData = {
      labels: ['6h', '8h', '10h', '12h', '14h', '16h', '18h'],
      datasets: [
        {
          label: 'Doanh thu',
          data: [850000, 1200000, 2100000, 3500000, 2800000, 3200000, 2100000],
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
          display: false,
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
              return value / 1000000 + 'M';
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

  initCategoryChart() {
    this.categoryChartData = {
      labels: ['Thực phẩm khô', 'Đồ uống', 'Gia vị', 'Đồ ăn vặt', 'Khác'],
      datasets: [
        {
          data: [35, 25, 20, 15, 5],
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
          position: 'bottom',
        },
      },
    };
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warn';
      case 'cancelled':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'pending':
        return 'Đang xử lý';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Khác';
    }
  }

  onPeriodChange() {}

  refreshData() {}

  exportReport() {}

  viewAllSales() {}

  viewAllProducts() {}
}
