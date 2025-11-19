import { Component, ChangeDetectionStrategy, output, inject, signal, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, ApiConnectionSettings } from './auth.service';
import { ApiInfo } from './api.model';

@Component({
  selector: 'app-admin-panel',
  
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/70 dark:bg-black/80 z-40 flex items-center justify-center" (click)="close.emit()">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Admin Paneli</h3>
            <p class="text-gray-500 dark:text-gray-400">Genel ve API'ye özel ayarları buradan yapılandırın.</p>
        </div>
        
        <div class="p-6 overflow-y-auto">
            <form #settingsForm="ngForm" (ngSubmit)="save()">
            <section class="mb-8">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Genel Dışa Aktarma Ayarları</h4>
                <div class="space-y-4">
                    <div>
                    <label for="driveUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Drive Klasör URL'si</label>
                    <input type="url" [(ngModel)]="driveUrl" name="driveUrl" id="driveUrl" placeholder="https://drive.google.com/drive/folders/..."
                            class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100">
                    </div>
                    <div>
                    <label for="repoUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Depo Adresi</label>
                    <input type="url" [(ngModel)]="repoUrl" name="repoUrl" id="repoUrl" placeholder="https://github.com/kullanici/repo-adi"
                            class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100">
                    </div>
                </div>
            </section>

            <section>
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">API Bağlantı Ayarları</h4>
                <div class="space-y-6">
                    @for(api of apis; track api.name) {
                        <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h5 class="font-bold text-gray-900 dark:text-gray-100">{{ api.name }}</h5>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label [for]="api.name + '-region'" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Varsayılan Bölge</label>
                                    <input type="text" [name]="api.name + '-region'" [id]="api.name + '-region'" 
                                           [(ngModel)]="connectionSettings[api.name].region"
                                           placeholder="us-east-1"
                                           class="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100">
                                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">API'nin varsayılan coğrafi çalışma bölgesi.</p>
                                </div>
                                <div>
                                    <label [for]="api.name + '-timeout'" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout Süresi (ms)</label>
                                    <input type="number" [name]="api.name + '-timeout'" [id]="api.name + '-timeout'"
                                           [(ngModel)]="connectionSettings[api.name].timeout"
                                           placeholder="30000"
                                           class="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100">
                                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">İstek zaman aşımı süresi (milisaniye).</p>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </section>
          </form>
        </div>
        
        <div class="p-6 mt-auto border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            @if(saveMessage()) {
                <p class="text-green-600 dark:text-green-400 text-sm text-center mb-4">{{ saveMessage() }}</p>
            }
            <div class="flex justify-end gap-4">
                <button type="button" (click)="close.emit()" class="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors">İptal</button>
                <button type="button" (click)="save()" class="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">Ayarları Kaydet</button>
            </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit {
  private authService = inject(AuthService);
  close = output<void>();

  @Input() apis: ApiInfo[] = [];

  driveUrl = '';
  repoUrl = '';
  connectionSettings: Record<string, ApiConnectionSettings> = {};
  saveMessage = signal('');

  ngOnInit(): void {
    const currentSettings = this.authService.settings();
    this.driveUrl = currentSettings.googleDriveUrl;
    this.repoUrl = currentSettings.githubRepoUrl;

    // Create a deep copy to avoid direct mutation of the signal's value
    this.connectionSettings = JSON.parse(JSON.stringify(this.authService.apiConnectionSettings()));
  }

  save(): void {
    this.authService.saveSettings(this.driveUrl, this.repoUrl);
    this.authService.saveApiConnectionSettings(this.connectionSettings);
    this.saveMessage.set('Ayarlar başarıyla kaydedildi!');
    setTimeout(() => this.saveMessage.set(''), 3000);
  }
}