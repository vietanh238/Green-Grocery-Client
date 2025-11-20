import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  type: 'sale' | 'import' | 'payment' | 'refund';
  order_code: string;
  created_at: string;
  customer_name?: string;
  amount: number;
  payment_method: string;
  status: string;
  items?: any[];
  note?: string;
}

interface TransactionStats {
  total_sales: number;
  total_imports: number;
  total_payments: number;
  total_refunds: number;
  total_transactions: number;
  period_revenue: number;
  period_expenses: number;
  net_amount: number;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    TagModule,
    ToastModule,
    DatePickerModule,
  ],
  providers: [MessageService],
})
export class HistoryComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  loading: boolean = false;

  activeTab: number = 0;
  searchText: string = '';
  selectedDateRange: Date[] = [];
  selectedType: any = null;
  selectedStatus: any = null;
  selectedPaymentMethod: any = null;

  stats: TransactionStats = {
    total_sales: 0,
    total_imports: 0,
    total_payments: 0,
    total_refunds: 0,
    total_transactions: 0,
    period_revenue: 0,
    period_expenses: 0,
    net_amount: 0,
  };

  typeOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Bán hàng', value: 'sale' },
    { label: 'Nhập hàng', value: 'import' },
    { label: 'Thanh toán', value: 'payment' },
    { label: 'Hoàn trả', value: 'refund' },
  ];

  statusOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Thành công', value: 'completed' },
    { label: 'Đang xử lý', value: 'pending' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  paymentMethodOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Tiền mặt', value: 'cash' },
    { label: 'Chuyển khoản', value: 'transfer' },
    { label: 'Quét mã', value: 'qr' },
    { label: 'Công nợ', value: 'debt' },
  ];

  constructor(private service: Service, private message: MessageService, private router: Router) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;

    const params: any = {};

    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      params.date_from = this.formatDate(this.selectedDateRange[0]);
      params.date_to = this.formatDate(this.selectedDateRange[1]);
    }

    if (this.selectedType && this.selectedType.value) {
      params.type = this.selectedType.value;
    }

    if (this.selectedStatus && this.selectedStatus.value) {
      params.status = this.selectedStatus.value;
    }

    if (this.selectedPaymentMethod && this.selectedPaymentMethod.value) {
      params.payment_method = this.selectedPaymentMethod.value;
    }

    this.service.getTransactionHistory(params).subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.transactions = rs.response.transactions || [];
          this.stats = rs.response.stats || this.stats;
          this.applyFilters();
        } else {
          this.showError('Không thể tải lịch sử giao dịch');
        }
      },
      error: (_error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.transactions];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.order_code.toLowerCase().includes(search) ||
          (t.customer_name && t.customer_name.toLowerCase().includes(search)) ||
          (t.note && t.note.toLowerCase().includes(search))
      );
    }

    switch (this.activeTab) {
      case 0:
        break;
      case 1:
        filtered = filtered.filter((t) => t.type === 'sale');
        break;
      case 2:
        filtered = filtered.filter((t) => t.type === 'import');
        break;
      case 3:
        filtered = filtered.filter((t) => t.type === 'payment');
        break;
      case 4:
        filtered = filtered.filter((t) => t.type === 'refund');
        break;
    }

    this.filteredTransactions = filtered;
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilters();
  }

  onFilterChange(): void {
    this.loadTransactions();
  }

  clearFilters(): void {
    this.selectedDateRange = [];
    this.selectedType = null;
    this.selectedStatus = null;
    this.selectedPaymentMethod = null;
    this.searchText = '';
    this.loadTransactions();
  }

  exportExcel(): void {
    if (!this.filteredTransactions || this.filteredTransactions.length === 0) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    const dataForExport = this.filteredTransactions.map((transaction, index) => ({
      STT: index + 1,
      'Mã giao dịch': transaction.order_code,
      'Loại giao dịch': this.getTypeLabel(transaction.type),
      'Thời gian': new Date(transaction.created_at).toLocaleString('vi-VN'),
      'Khách hàng': transaction.customer_name || 'Khách lẻ',
      'Số tiền (VNĐ)': transaction.amount,
      'Thanh toán': this.getPaymentMethodLabel(transaction.payment_method),
      'Trạng thái': this.getStatusLabel(transaction.status),
      'Ghi chú': transaction.note || '',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);

    const colWidths = [
      { wch: 5 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử giao dịch');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Lich_su_giao_dich_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.showSuccess('Xuất báo cáo Excel thành công!');
  }

  viewDetails(transaction: Transaction): void {
    console.log('View transaction details:', transaction);
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      sale: 'Bán hàng',
      import: 'Nhập hàng',
      payment: 'Thanh toán',
      refund: 'Hoàn trả',
    };
    return labels[type] || type;
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' {
    const severities: { [key: string]: 'success' | 'info' | 'warn' | 'danger' } = {
      sale: 'success',
      import: 'info',
      payment: 'warn',
      refund: 'danger',
    };
    return severities[type] || 'info';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      completed: 'Thành công',
      pending: 'Đang xử lý',
      cancelled: 'Đã hủy',
      paid: 'Đã thanh toán',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    const severities: { [key: string]: 'success' | 'info' | 'warn' | 'danger' } = {
      completed: 'success',
      paid: 'success',
      pending: 'warn',
      cancelled: 'danger',
    };
    return severities[status] || 'info';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      cash: 'Tiền mặt',
      transfer: 'Chuyển khoản',
      qr: 'Quét mã',
      debt: 'Công nợ',
    };
    return labels[method] || method;
  }

  getAmountClass(transaction: Transaction): string {
    if (transaction.type === 'sale' || transaction.type === 'payment') {
      return 'amount-positive';
    }
    return 'amount-negative';
  }

  formatAmount(transaction: Transaction): string {
    const sign = transaction.type === 'sale' || transaction.type === 'payment' ? '+' : '-';
    return `${sign}${transaction.amount.toLocaleString('vi-VN')} đ`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  navigateBack(): void {
    this.router.navigate(['/page/home']);
  }

  private showSuccess(detail: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }

  private showError(detail: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }
}
