import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ExcelColumn {
  field: string;
  header: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date';
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

export interface ExcelReadResult<T> {
  success: boolean;
  data: T[];
  errors: ExcelError[];
  totalRows: number;
  validRows: number;
}

export interface ExcelError {
  row: number;
  column: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  readExcel<T>(file: File, columns: ExcelColumn[]): Promise<ExcelReadResult<T>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

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

  private processExcelData<T>(rawData: any[], columns: ExcelColumn[]): ExcelReadResult<T> {
    const errors: ExcelError[] = [];
    const validData: T[] = [];
    let validRows = 0;

    rawData.forEach((row, index) => {
      const rowNumber = index + 2;
      const processedRow: any = {};
      let isValidRow = true;

      columns.forEach((column) => {
        const cellValue = row[column.header];

        if (
          column.required &&
          (cellValue === '' || cellValue === null || cellValue === undefined)
        ) {
          errors.push({
            row: rowNumber,
            column: column.header,
            message: `Trường "${column.header}" là bắt buộc`,
          });
          isValidRow = false;
          return;
        }

        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          let processedValue = cellValue;

          if (column.type === 'number') {
            processedValue = Number(cellValue);
            if (isNaN(processedValue)) {
              errors.push({
                row: rowNumber,
                column: column.header,
                message: `Giá trị "${cellValue}" không phải là số hợp lệ`,
              });
              isValidRow = false;
              return;
            }
          }

          if (column.validator && !column.validator(processedValue)) {
            errors.push({
              row: rowNumber,
              column: column.header,
              message: `Giá trị "${cellValue}" không hợp lệ`,
            });
            isValidRow = false;
            return;
          }

          if (column.transformer) {
            processedValue = column.transformer(processedValue);
          }

          processedRow[column.field] = processedValue;
        } else {
          processedRow[column.field] = column.type === 'number' ? 0 : '';
        }
      });

      if (isValidRow) {
        validData.push(processedRow as T);
        validRows++;
      }
    });

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      totalRows: rawData.length,
      validRows,
    };
  }

  exportToExcel<T>(data: T[], filename: string, headers: { [key: string]: string }): void {
    const exportData = data.map((item: any) => {
      const row: any = {};
      Object.keys(headers).forEach((key) => {
        row[headers[key]] = item[key] !== null && item[key] !== undefined ? item[key] : '';
      });
      return row;
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `${filename}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  downloadTemplate(columns: ExcelColumn[], filename: string): void {
    const headers = columns.reduce((acc, col) => {
      acc[col.field] = col.header;
      return acc;
    }, {} as { [key: string]: string });

    const sampleData = [{}];
    this.exportToExcel(sampleData, filename, headers);
  }
}
