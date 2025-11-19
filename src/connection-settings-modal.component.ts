

import { Component, ChangeDetectionStrategy, output, inject, signal, Input, computed } from '@angular/core';
import { AuthService, ApiConnectionSettings } from './auth.service';
import { ApiInfo } from './api.model';

@Component({
  selector: 'app-connection-settings-modal',
  
  imports: [],
  template: `
    <div class="fixed inset-0 bg-black/70 dark:bg-black/80 z-40 flex items-center justify-center" (click)="close.emit()">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between">
            <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ api?.name }}</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6">Varsayılan Bağlantı Ayarları</p>
            </div>
            <button (click)="close.emit()" class="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        @if (settings(); as s) {
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between items-center bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                        <span class="font-medium text-gray-700 dark:text-gray-300">Varsayılan Bölge:</span>
                        <span class="font-mono bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">{{ s.region || 'Ayarlanmadı' }}</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1 px-1">API'nin varsayılan coğrafi çalışma bölgesi.</p>
                </div>
                <div>
                    <div class="flex justify-between items-center bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                        <span class="font-medium text-gray-700 dark:text-gray-300">Timeout Süresi:</span>
                        <span class="font-mono bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">{{ s.timeout ? s.timeout + ' ms' : 'Ayarlanmadı' }}</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1 px-1">İstek zaman aşımı süresi (milisaniye).</p>
                </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-500 mt-6">Bu ayarlar Admin Paneli üzerinden yönetilir ve üretilen kod örneklerini etkileyebilir.</p>
        } @else {
            <p class="text-gray-500 dark:text-gray-400 text-center">Bu API için özel bağlantı ayarı bulunmuyor.</p>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionSettingsModalComponent {
  private authService = inject(AuthService);
  
  @Input() api: ApiInfo | null = null;
  close = output<void>();

  settings = computed(() => {
    if (!this.api) return null;
    return this.authService.apiConnectionSettings()[this.api.name] || null;
  });
}