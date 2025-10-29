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
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  readonly Math = Math;

  selectedPeriod: string = 'month';
  periodOptions = [
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
    { label: 'Năm nay', value: 'year' },
    { label: 'Tùy chỉnh', value: 'custom' },
  ];

  customDateFrom: string = '';
  customDateTo: string = '';
  showCustomDate: boolean = false;
  loading: boolean = false;

  totalRevenue: number = 0;
  totalProfit: number = 0;
  totalOrders: number = 0;
  profitMargin: number = 0;

  revenueGrowth: number = 0;
  profitGrowth: number = 0;
  orderGrowth: number = 0;
  marginGrowth: number = 0;

  revenueComparison: number = 0;
  profitComparison: number = 0;
  orderComparison: number = 0;

  topProducts: TopProduct[] = [];
  monthlyRevenueData: MonthlyRevenue[] = [];

  revenueChartData: any;
  profitChartData: any;
  topProductsChartData: any;

  commonChartOptions: any;
  pieChartOptions: any;

  constructor(private service: Service, private message: MessageService) {}

  ngOnInit() {
    this.initializeChartOptions();
    this.loadReportData();
  }

  private initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

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
            callback: (value: any) => `${value}M`,
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
      },
    };
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.showCustomDate = true;
    } else {
      this.showCustomDate = false;
      this.loadReportData();
    }
  }

  onDateRangeSelect(): void {
    if (this.customDateFrom && this.customDateTo) {
      this.loadReportData();
    }
  }

  private loadReportData(): void {
    this.loading = true;

    const params =
      this.selectedPeriod === 'custom'
        ? {
            period: 'custom',
            date_from: this.customDateFrom,
            date_to: this.customDateTo,
          }
        : { period: this.selectedPeriod };

    this.service.getBusinessReport(params).subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.processReportData(rs.response);
          this.initializeCharts();
        } else {
          this.showError('Không thể tải báo cáo');
        }
      },
      (error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      }
    );
  }

  private processReportData(data: any): void {
    this.totalRevenue = data.total_revenue || 0;
    this.totalProfit = data.total_profit || 0;
    this.totalOrders = data.orders_count || 0;
    this.profitMargin = data.profit_margin || 0;

    this.revenueGrowth = data.revenue_growth || 0;
    this.profitGrowth = data.profit_growth || 0;
    this.orderGrowth = data.order_growth || 0;
    this.marginGrowth = data.margin_growth || 0;

    this.revenueComparison = data.revenue_comparison || 0;
    this.profitComparison = data.profit_comparison || 0;
    this.orderComparison = data.order_comparison || 0;

    this.topProducts = data.top_products || [];
    this.monthlyRevenueData = data.monthly_revenue || [];
  }

  private initializeCharts(): void {
    this.initRevenueChart();
    this.initProfitChart();
    this.initTopProductsChart();
  }

  private initRevenueChart(): void {
    const labels = this.monthlyRevenueData.map((item) => item.month);
    const data = this.monthlyRevenueData.map((item) => item.revenue / 1000000);

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

  private initProfitChart(): void {
    const labels = this.monthlyRevenueData.map((item) => item.month);
    const data = this.monthlyRevenueData.map((item) => (item.revenue * 0.3) / 1000000);

    this.profitChartData = {
      labels,
      datasets: [
        {
          label: 'Lợi nhuận',
          data,
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 1,
        },
      ],
    };
  }

  private initTopProductsChart(): void {
    const labels = this.topProducts.slice(0, 5).map((item) => item.name);
    const data = this.topProducts.slice(0, 5).map((item) => item.revenue / 1000000);

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    this.topProductsChartData = {
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

  exportExcel(): void {
    if (!this.topProducts.length) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    const dataForExport = [
      {
        'Chỉ tiêu': 'Tổng doanh thu',
        'Giá trị': `${(this.totalRevenue / 1000000).toFixed(2)}M đ`,
      },
      {
        'Chỉ tiêu': 'Tổng lợi nhuận',
        'Giá trị': `${(this.totalProfit / 1000000).toFixed(2)}M đ`,
      },
      {
        'Chỉ tiêu': 'Tỷ suất lợi nhuận',
        'Giá trị': `${this.profitMargin.toFixed(2)}%`,
      },
      { 'Chỉ tiêu': '', 'Giá trị': '' },
      ...this.topProducts.map((product, index) => ({
        STT: index + 1,
        'Tên sản phẩm': product.name,
        'Số lượng': product.quantity,
        'Doanh thu': `${(product.revenue / 1000000).toFixed(2)}M đ`,
      })),
    ];

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo kinh doanh');

    const fileName = `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.showSuccess('Xuất báo cáo Excel thành công!');
  }

  exportPDF(): void {
    // 1. Lấy element HTML bằng ID bạn đã đặt
    const reportElement = document.getElementById('reportContent');

    if (!reportElement) {
      this.showError('Không tìm thấy nội dung báo cáo để xuất.');
      return;
    }

    this.loading = true;

    // 2. Dùng html2canvas để "chụp ảnh" element
    html2canvas(reportElement, {
      scale: 2, // Tăng gấp đôi chất lượng ảnh
      useCORS: true, // Cho phép tải ảnh từ các nguồn khác (nếu có)
    })
      .then((canvas) => {
        try {
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfPageWidth = pdf.internal.pageSize.getWidth();
          const pdfPageHeight = pdf.internal.pageSize.getHeight();

          const margin = 10;
          const usableWidth = pdfPageWidth - margin * 2;
          const usableHeight = pdfPageHeight - margin * 2;

          const ratio = usableWidth / imgWidth;
          const scaledImgHeight = imgHeight * ratio;

          let heightLeft = scaledImgHeight;
          let position = 0;
          pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledImgHeight);
          heightLeft -= usableHeight;
          while (heightLeft > 0) {
            position -= usableHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position + margin, usableWidth, scaledImgHeight);
            heightLeft -= usableHeight;
          }

          const fileName = `BaoCao_KinhDoanh_${new Date().toISOString().slice(0, 10)}.pdf`;
          pdf.save(fileName);

          this.showSuccess('Xuất báo cáo PDF thành công!');
        } catch (e) {
          console.error('Lỗi khi tạo PDF:', e);
          this.showError('Có lỗi xảy ra khi tạo file PDF.');
        } finally {
          this.loading = false;
        }
      })
      .catch((err) => {
        console.error('Lỗi html2canvas:', err);
        this.showError('Không thể chụp ảnh màn hình báo cáo.');
        this.loading = false;
      });
  }

  printReport(): void {
    window.print();
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
