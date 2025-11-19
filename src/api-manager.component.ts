import { Component, ChangeDetectionStrategy, output, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiCredentialService, ApiCredential, CredentialPair } from './api-credential.service';
import { ApiInfo } from './api.model';

@Component({
  selector: 'app-api-manager',
  
  imports: [FormsModule],
  templateUrl: './api-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiManagerComponent {
  @Input() apis: ApiInfo[] = [];
  close = output<void>();
  credentialService = inject(ApiCredentialService);

  // Form state for adding/editing
  selectedApi = signal('');
  credentialPairs = signal<CredentialPair[]>([{ key: '', value: '' }]);
  
  // Edit state
  editingCredentialName = signal<string | null>(null);

  isFormInvalid = computed(() => {
    return this.credentialPairs().some(p => p.key.trim() === '' || p.value.trim() === '');
  });

  savedApiNames = computed(() => this.credentialService.credentials().map(c => c.apiName));

  isApiSaved(apiName: string): boolean {
    return this.savedApiNames().includes(apiName);
  }
  
  addPair(): void {
    this.credentialPairs.update(pairs => [...pairs, { key: '', value: '' }]);
  }

  removePair(index: number): void {
    this.credentialPairs.update(pairs => pairs.filter((_, i) => i !== index));
  }

  startEditing(cred: ApiCredential): void {
    this.editingCredentialName.set(cred.apiName);
    this.selectedApi.set(cred.apiName);
    this.credentialPairs.set(JSON.parse(JSON.stringify(cred.pairs))); // Deep copy
  }

  cancelEditing(): void {
    this.editingCredentialName.set(null);
    this.resetForm();
  }

  saveOrUpdateCredential(): void {
    const apiName = this.selectedApi();
    const pairs = this.credentialPairs().filter(p => p.key.trim() !== '' && p.value.trim() !== '');

    if (!apiName || pairs.length === 0) {
      return; 
    }

    if (this.editingCredentialName()) {
      this.credentialService.updateCredential(apiName, pairs);
    } else {
      this.credentialService.saveCredential(apiName, pairs);
    }
    
    this.cancelEditing();
  }

  removeCredential(apiName: string): void {
    if (confirm(`${apiName} için kayıtlı kimlik bilgilerini silmek istediğinizden emin misiniz?`)) {
      this.credentialService.removeCredential(apiName);
      if (this.editingCredentialName() === apiName) {
        this.cancelEditing();
      }
    }
  }

  private resetForm(): void {
    this.selectedApi.set('');
    this.credentialPairs.set([{ key: '', value: '' }]);
  }
}