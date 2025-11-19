import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';

interface TableData {
  headers: string[];
  rows: any[][];
}

type ViewMode = 'table' | 'keyValue' | 'raw';
type Status = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-api-response-viewer',
  
  imports: [JsonPipe],
  templateUrl: './api-response-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiResponseViewerComponent {
  data = input.required<any>();
  status = input<Status>('idle');

  private isTableData(data: any): boolean {
    return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0]);
  }

  private isKeyValueData(data: any): boolean {
    return typeof data === 'object' && data !== null && !Array.isArray(data);
  }

  viewMode = computed<ViewMode>(() => {
    const d = this.data();
    if (this.isTableData(d)) {
      return 'table';
    }
    if (this.isKeyValueData(d)) {
      return 'keyValue';
    }
    return 'raw';
  });

  tableData = computed<TableData | null>(() => {
    if (this.viewMode() !== 'table') return null;

    const rawData = this.data();
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return null;
    
    const headerSet = new Set<string>();
    rawData.forEach(item => {
        if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => headerSet.add(key));
        }
    });

    const headers = Array.from(headerSet);
    const rows = rawData.map((item: any) => 
        headers.map(header => {
            const value = item[header];
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return value;
        })
    );

    return { headers, rows };
  });

  keyValueData = computed<{ key: string, value: any }[] | null>(() => {
    if (this.viewMode() !== 'keyValue') return null;
    const rawData = this.data();
    if (typeof rawData !== 'object' || rawData === null || Array.isArray(rawData)) {
        return null;
    }
    return Object.entries(rawData).map(([key, value]) => ({ key, value }));
  });
  
  prettyJson = computed(() => {
    if (this.viewMode() !== 'raw') return '';
    try {
        return JSON.stringify(this.data(), null, 2);
    } catch (e) {
        return String(this.data());
    }
  });
  
  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }
}