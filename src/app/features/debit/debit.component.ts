import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
  lastTransaction: string;
  status: string;
}

interface DebtTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  amount: number;
  note: string;
  date: string;
  remainingDebt: number;
}

@Component({
  selector: 'app-debt',
  standalone: true,
  templateUrl: './debit.component.html',
  styleUrl: './debit.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToastModule,
    TabsModule,
    IconFieldModule,
    InputIconModule,
  ],
})
export class DebtComponent implements OnInit {
  totalDebt: number = 45800000;
  totalCustomers: number = 18;
  overdueDebt: number = 12500000;
  thisMonthDebt: number = 8300000;

  selectedCustomer: Customer | null = null;
  showAddCustomerDialog: boolean = false;
  showAddDebtDialog: boolean = false;
  showPaymentDialog: boolean = false;
  showCustomerDetailDialog: boolean = false;

  searchValue: string = '';
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  debtTransactions: DebtTransaction[] = [];
  customerTransactions: DebtTransaction[] = [];

  newCustomer = {
    name: '',
    phone: '',
    address: '',
  };

  newDebt = {
    customerId: '',
    amount: 0,
    note: '',
  };

  newPayment = {
    customerId: '',
    amount: 0,
    note: '',
  };

  amountDisplay: string = '';
  loading: boolean = false;

  constructor(private message: MessageService) {}

  ngOnInit() {
    this.loadMockData();
  }

  loadMockData() {
    this.customers = [
      {
        id: 'KH001',
        name: 'Nguyễn Văn An',
        phone: '0901234567',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        totalDebt: 5800000,
        lastTransaction: '2025-10-10',
        status: 'active',
      },
      {
        id: 'KH002',
        name: 'Trần Thị Bình',
        phone: '0912345678',
        address: '456 Đường XYZ, Quận 2, TP.HCM',
        totalDebt: 3200000,
        lastTransaction: '2025-10-12',
        status: 'active',
      },
      {
        id: 'KH003',
        name: 'Lê Văn Cường',
        phone: '0923456789',
        address: '789 Đường DEF, Quận 3, TP.HCM',
        totalDebt: 8500000,
        lastTransaction: '2025-09-28',
        status: 'overdue',
      },
      {
        id: 'KH004',
        name: 'Phạm Thị Dung',
        phone: '0934567890',
        address: '321 Đường GHI, Quận 4, TP.HCM',
        totalDebt: 1200000,
        lastTransaction: '2025-10-14',
        status: 'active',
      },
      {
        id: 'KH005',
        name: 'Hoàng Văn Em',
        phone: '0945678901',
        address: '654 Đường JKL, Quận 5, TP.HCM',
        totalDebt: 6700000,
        lastTransaction: '2025-09-15',
        status: 'overdue',
      },
    ];

    this.debtTransactions = [
      {
        id: 'GD001',
        customerId: 'KH001',
        customerName: 'Nguyễn Văn An',
        type: 'debt',
        amount: 2000000,
        note: 'Mua hàng tháng 10',
        date: '2025-10-10 14:30',
        remainingDebt: 5800000,
      },
      {
        id: 'GD002',
        customerId: 'KH002',
        customerName: 'Trần Thị Bình',
        type: 'payment',
        amount: 1000000,
        note: 'Trả nợ một phần',
        date: '2025-10-12 10:15',
        remainingDebt: 3200000,
      },
      {
        id: 'GD003',
        customerId: 'KH003',
        customerName: 'Lê Văn Cường',
        type: 'debt',
        amount: 3500000,
        note: 'Mua sỉ đầu tháng',
        date: '2025-09-28 09:20',
        remainingDebt: 8500000,
      },
      {
        id: 'GD004',
        customerId: 'KH004',
        customerName: 'Phạm Thị Dung',
        type: 'debt',
        amount: 1200000,
        note: 'Đơn hàng #HD123',
        date: '2025-10-14 16:45',
        remainingDebt: 1200000,
      },
      {
        id: 'GD005',
        customerId: 'KH001',
        customerName: 'Nguyễn Văn An',
        type: 'payment',
        amount: 1500000,
        note: 'Thanh toán',
        date: '2025-10-08 11:30',
        remainingDebt: 3800000,
      },
    ];

    this.filteredCustomers = [...this.customers];
  }

  onSearch() {
    if (!this.searchValue.trim()) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    const search = this.searchValue.toLowerCase();
    this.filteredCustomers = this.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.id.toLowerCase().includes(search)
    );
  }

  clearSearch() {
    this.searchValue = '';
    this.filteredCustomers = [...this.customers];
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'warning':
        return 'warn';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang nợ';
      case 'overdue':
        return 'Quá hạn';
      case 'warning':
        return 'Cảnh báo';
      default:
        return 'Khác';
    }
  }

  getTransactionTypeSeverity(type: string): string {
    return type === 'debt' ? 'danger' : 'success';
  }

  getTransactionTypeLabel(type: string): string {
    return type === 'debt' ? 'Ghi nợ' : 'Trả nợ';
  }

  openAddCustomerDialog() {
    this.showAddCustomerDialog = true;
    this.resetCustomerForm();
  }

  openAddDebtDialog() {
    this.showAddDebtDialog = true;
    this.resetDebtForm();
  }

  openPaymentDialog() {
    this.showPaymentDialog = true;
    this.resetPaymentForm();
  }

  viewCustomerDetail(customer: Customer) {
    this.selectedCustomer = customer;
    this.customerTransactions = this.debtTransactions.filter((t) => t.customerId === customer.id);
    this.showCustomerDetailDialog = true;
  }

  addCustomer() {
    if (!this.newCustomer.name || !this.newCustomer.phone) {
      this.message.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập đầy đủ thông tin',
        life: 3000,
      });
      return;
    }

    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Thêm khách hàng thành công',
      life: 3000,
    });

    this.showAddCustomerDialog = false;
    this.resetCustomerForm();
  }

  addDebt() {
    if (!this.newDebt.customerId || !this.newDebt.amount) {
      this.message.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập đầy đủ thông tin',
        life: 3000,
      });
      return;
    }

    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Ghi nợ thành công',
      life: 3000,
    });

    this.showAddDebtDialog = false;
    this.resetDebtForm();
  }

  addPayment() {
    if (!this.newPayment.customerId || !this.newPayment.amount) {
      this.message.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập đầy đủ thông tin',
        life: 3000,
      });
      return;
    }

    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Ghi nhận thanh toán thành công',
      life: 3000,
    });

    this.showPaymentDialog = false;
    this.resetPaymentForm();
  }

  resetCustomerForm() {
    this.newCustomer = {
      name: '',
      phone: '',
      address: '',
    };
  }

  resetDebtForm() {
    this.newDebt = {
      customerId: '',
      amount: 0,
      note: '',
    };
    this.amountDisplay = '';
  }

  resetPaymentForm() {
    this.newPayment = {
      customerId: '',
      amount: 0,
      note: '',
    };
    this.amountDisplay = '';
  }

  inputAmount(event: any, type: 'debt' | 'payment'): void {
    const input = event.target;
    let value = input.value;

    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') {
      if (type === 'debt') {
        this.newDebt.amount = 0;
      } else {
        this.newPayment.amount = 0;
      }
      this.amountDisplay = '';
      input.value = '';
      return;
    }

    const amount = parseInt(numericValue, 10);
    if (type === 'debt') {
      this.newDebt.amount = amount;
    } else {
      this.newPayment.amount = amount;
    }

    const displayValue = this.formatNumberWithDots(numericValue);
    this.amountDisplay = displayValue;
    input.value = displayValue;

    setTimeout(() => {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  }

  blurAmount(event: any): void {
    const input = event.target;
    if (this.amountDisplay && this.amountDisplay !== '0') {
      input.value = this.amountDisplay + ' VND';
    } else {
      input.value = '';
    }
  }

  focusAmount(event: any): void {
    const input = event.target;
    if (this.amountDisplay) {
      input.value = this.amountDisplay;
    } else {
      input.value = '';
    }
    setTimeout(() => {
      input.select();
    }, 0);
  }

  private formatNumberWithDots(numericString: string): string {
    if (!numericString || numericString === '0') return '';
    const cleanNumber = numericString.replace(/^0+/, '') || '0';
    if (cleanNumber === '0') return '';
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  deleteCustomer(customer: Customer) {
    if (confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) {
      this.message.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Đã xóa khách hàng',
        life: 3000,
      });
    }
  }

  exportData() {
    this.message.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: 'Đang xuất dữ liệu...',
      life: 3000,
    });
  }

  sendReminder(customer: Customer) {
    this.message.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: `Đã gửi nhắc nợ đến ${customer.name}`,
      life: 3000,
    });
  }
}
