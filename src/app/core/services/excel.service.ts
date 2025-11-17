import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ExcelColumn {
  field: string;
  header: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  validator?: (value: any) => boolean;
}

export interface ExcelReadResult<T> {
  success: boolean;
  data: T[];
  errors: Array<{ row: number; column: string; message: string }>;
  totalRows: number;
  validRows: number;
}

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  constructor() {}

  downloadTemplate(columns: ExcelColumn[], fileName: string): void {
    const headers = columns.map((col) => col.header);
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([headers]);

    const colWidths = columns.map((col) => {
      const headerLength = col.header.length;
      return { wch: Math.max(headerLength + 5, 15) };
    });
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
  }

  async readExcel<T>(file: File, columns: ExcelColumn[]): Promise<ExcelReadResult<T>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const result = this.processExcelData<T>(jsonData, columns);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  }

  private processExcelData<T>(jsonData: any[], columns: ExcelColumn[]): ExcelReadResult<T> {
    const errors: Array<{ row: number; column: string; message: string }> = [];
    const validData: T[] = [];

    if (jsonData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, column: 'File', message: 'File rỗng' }],
        totalRows: 0,
        validRows: 0,
      };
    }

    const headers = jsonData[0];
    const headerMap = this.mapHeaders(headers, columns);

    if (Object.keys(headerMap).length !== columns.length) {
      const missingColumns = columns
        .filter((col) => !Object.values(headerMap).includes(col.field))
        .map((col) => col.header);

      if (missingColumns.length > 0) {
        return {
          success: false,
          data: [],
          errors: [
            {
              row: 0,
              column: 'Headers',
              message: `Thiếu các cột: ${missingColumns.join(', ')}`,
            },
          ],
          totalRows: 0,
          validRows: 0,
        };
      }
    }

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];

      if (this.isEmptyRow(row)) {
        continue;
      }

      const rowData: any = {};
      let rowHasError = false;

      for (const [headerIndex, field] of Object.entries(headerMap)) {
        const column = columns.find((col) => col.field === field);
        if (!column) continue;

        const cellValue = row[parseInt(headerIndex)];

        if (
          column.required &&
          (cellValue === undefined || cellValue === null || cellValue === '')
        ) {
          errors.push({
            row: i + 1,
            column: column.header,
            message: `Không được để trống`,
          });
          rowHasError = true;
          continue;
        }

        const processedValue = this.processValue(cellValue, column);

        if (column.validator && !column.validator(processedValue)) {
          errors.push({
            row: i + 1,
            column: column.header,
            message: `Giá trị không hợp lệ`,
          });
          rowHasError = true;
          continue;
        }

        rowData[field] = processedValue;
      }

      if (!rowHasError) {
        validData.push(rowData as T);
      }
    }

    return {
      success: errors.length === 0,
      data: validData,
      errors: errors,
      totalRows: jsonData.length - 1,
      validRows: validData.length,
    };
  }

  private mapHeaders(headers: any[], columns: ExcelColumn[]): { [key: number]: string } {
    const headerMap: { [key: number]: string } = {};

    headers.forEach((header, index) => {
      const normalizedHeader = this.normalizeString(header);
      const column = columns.find((col) => this.normalizeString(col.header) === normalizedHeader);
      if (column) {
        headerMap[index] = column.field;
      }
    });

    return headerMap;
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private isEmptyRow(row: any[]): boolean {
    return !row || row.every((cell) => cell === undefined || cell === null || cell === '');
  }

  private processValue(value: any, column: ExcelColumn): any {
    if (value === undefined || value === null || value === '') {
      return column.type === 'number' ? 0 : column.type === 'boolean' ? false : '';
    }

    switch (column.type) {
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim();
          return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'có';
        }
        return Boolean(value);

      case 'date':
        if (value instanceof Date) return value;
        if (typeof value === 'number') {
          const date = XLSX.SSF.parse_date_code(value);
          return new Date(date.y, date.m - 1, date.d);
        }
        return new Date(value);

      case 'string':
      default:
        return String(value).trim();
    }
  }

  exportToExcel(data: any[], columns: { field: string; header: string }[], fileName: string): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const exportData = data.map((item) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.header] = item[col.field];
      });
      return row;
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    const colWidths = columns.map((col) => ({
      wch: Math.max(col.header.length + 5, 15),
    }));
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
  }
}
