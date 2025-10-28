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
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../component/confirmDialog/confirmDialog.component';
import moment from 'moment';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
  lastTransaction: string;
  status: string;
  colorStatus: string;
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
  totalDebt: number = 0;
  totalCustomers: number = 0;
  overdueDebt: number = 0;
  thisMonthDebt: number = 0;
  change_percent: number = 0;
  countTransaction: number = 0;
  overdue_customers: number = 0;

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

  constructor(
    private message: MessageService,
    private service: Service,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.getCustomer();
    this.getDebit();
  }
  private getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  getCustomer() {
    this.service.getCustomer().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          if (rs.response && rs.response.length > 0) {
            let data = rs.response;
            data = data.map((item: any, index: number) => ({
              id: item?.customer_code,
              name: item?.name,
              phone: item?.phone,
              address: item?.address,
              totalDebt: item?.total_debt || 0,
              lastTransaction: item?.last_transaction
                ? moment(item?.last_transaction).format('DD/MM/YYYY')
                : 'Không có giao dịch',
              status: item?.status,
              colorStatus: this.getColorStatus(item?.status),
            }));
            this.customers = data;
            this.filteredCustomers = [...this.customers];
          }
        }
      },
      (_error: any) => {
        this.showError('Lỗi hệ thống');
      }
    );
  }

  getColorStatus(status: any): string {
    let color: string = 'secondary';
    switch (status) {
      case 'in_debt': {
        color = 'warn';
        break;
      }
      case 'overdue': {
        color = 'danger';
        break;
      }
      case 'paid_debt': {
        color = 'success';
        break;
      }
      default: {
        color = 'secondary';
      }
    }
    return color;
  }

  getDebit() {
    this.service.getDebit().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.totalDebt = rs.response?.total_debt || 0;
          this.change_percent = rs.response?.change_percent || 0;
          this.totalCustomers = rs.response?.customer_count || 0;
          this.thisMonthDebt = rs.response?.debit_this_month?.this_month_amount || 0;
          this.countTransaction = rs.response?.debit_this_month?.this_month_transactions || 0;
          this.overdueDebt = rs.response?.debit_overdue?.overdue_amount || 0;
          this.overdue_customers = rs.response?.debit_overdue?.overdue_customers || 0;
        }
      },
      (_error: any) => {
        this.showError('Lỗi hệ thống');
      }
    );
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
      case 'no_debt':
        return 'Không nợ';
      case 'in_debt':
        return 'Đang nợ';
      case 'overdue':
        return 'Quá hạn';
      case 'paid_debt':
        return 'Đã trả';
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
        detail: 'Vui lòng nhập tên và số điện thoại khách hàng',
        life: 3000,
      });
      return;
    }

    const params = {
      name: this.newCustomer.name.trim(),
      phone: this.newCustomer.phone.trim(),
      address: this.newCustomer.address.trim(),
    };

    this.loading = true;
    this.service.createCustomer(params).subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.message.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Thêm khách hàng thành công',
            life: 3000,
          });
          this.showAddCustomerDialog = false;
          this.resetCustomerForm();
          this.getCustomer();
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: rs.error_message || 'Thêm khách hàng thất bại',
            life: 3000,
          });
        }
      },
      (error: any) => {
        this.loading = false;
        this.message.add({
          severity: 'error',
          summary: 'Lỗi hệ thống',
          detail: 'Không thể thêm khách hàng. Vui lòng thử lại',
          life: 3000,
        });
      }
    );
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

    const params = {
      customer_code: this.newDebt.customerId,
      debit_amount: this.newDebt.amount,
      due_date: this.getCurrentDate(),
      note: this.newDebt.note.trim(),
    };

    this.loading = true;
    this.service.createDebit(params).subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.message.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Ghi nợ thành công',
            life: 3000,
          });
          this.showAddDebtDialog = false;
          this.resetDebtForm();
          this.getCustomer();
          this.getDebit();
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: rs.error_message || 'Ghi nợ thất bại',
            life: 3000,
          });
        }
      },
      (error: any) => {
        this.loading = false;
        this.message.add({
          severity: 'error',
          summary: 'Lỗi hệ thống',
          detail: 'Không thể ghi nợ. Vui lòng thử lại',
          life: 3000,
        });
      }
    );
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

    const params = {
      customer_code: this.newPayment.customerId,
      paid_amount: this.newPayment.amount,
      note: this.newPayment.note.trim(),
    };

    this.loading = true;
    this.service.payDebit(params).subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.message.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Ghi nhận thanh toán thành công',
            life: 3000,
          });
          this.showPaymentDialog = false;
          this.resetPaymentForm();
          this.getCustomer();
          this.getDebit();
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: rs.error_message || 'Thanh toán thất bại',
            life: 3000,
          });
        }
      },
      (error: any) => {
        this.loading = false;
        this.message.add({
          severity: 'error',
          summary: 'Lỗi hệ thống',
          detail: 'Không thể thanh toán. Vui lòng thử lại',
          life: 3000,
        });
      }
    );
  }

  deleteCustomer(customer: Customer) {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      disableClose: true,
      data: {
        title: 'Xác nhận xóa sản phẩm',
        buttons: [
          {
            label: 'Hủy',
            class: 'default',
            value: false,
            color: '',
            background: '',
          },
          {
            label: 'Xác nhận',
            class: 'primary',
            value: true,
            color: '',
            background: '',
          },
        ],
      },
    });
    dialog.afterClosed().subscribe((result: any) => {
      if (result) {
        this.loading = true;
        this.service.deleteCustomer(customer.id).subscribe(
          (rs: any) => {
            this.loading = false;
            if (rs.status === ConstantDef.STATUS_SUCCESS) {
              this.message.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã xóa khách hàng',
                life: 3000,
              });
              this.getCustomer();
              this.getDebit();
            } else {
              this.message.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: rs.error_message || 'Xóa khách hàng thất bại',
                life: 3000,
              });
            }
          },
          (error: any) => {
            this.loading = false;
            this.message.add({
              severity: 'error',
              summary: 'Lỗi hệ thống',
              detail: 'Không thể xóa khách hàng. Vui lòng thử lại',
              life: 3000,
            });
          }
        );
      }
    });
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

  exportData() {
    if (!this.filteredCustomers || this.filteredCustomers.length === 0) {
      this.message.add({
        severity: 'error',
        summary: 'Thông báo',
        detail: 'Không có dữ liệu để xuất',
        life: 3000,
      });
      return;
    }

    const dataForExport = this.filteredCustomers.map((customer, index) => ({
      STT: index + 1,
      'Mã KH': customer.id,
      'Tên khách hàng': customer.name,
      'Số điện thoại': customer.phone,
      'Địa chỉ': customer.address || '',
      'Tổng nợ (VNĐ)': customer.totalDebt,
      'Giao dịch cuối': customer.lastTransaction,
      'Trạng thái': this.getStatusLabel(customer.status),
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);

    const colWidths = [
      { wch: 5 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const headerStyle = {
      fill: { fgColor: { rgb: 'FFD966' } },
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = headerStyle;
    }

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachKhachHang');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `BaoCao_CongNo_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.message.add({
      severity: 'success',
      summary: 'Thông báo',
      detail: 'Xuất báo cáo Excel thành công!',
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

  showError(message: string) {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail: `${message}`,
      life: 3000,
    });
  }
}
