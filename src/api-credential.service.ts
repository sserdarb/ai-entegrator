import { Injectable, signal, effect } from '@angular/core';

export interface CredentialPair {
  key: string;
  value: string;
}

export interface ApiCredential {
  apiName: string;
  pairs: CredentialPair[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiCredentialService {
  private readonly storageKey = 'api-credentials';
  credentials = signal<ApiCredential[]>([]);

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCreds = window.localStorage.getItem(this.storageKey);
      if (savedCreds) {
        try {
          this.credentials.set(JSON.parse(savedCreds));
        } catch (e) {
          console.error('Could not parse API credentials from localStorage', e);
          this.credentials.set([]);
        }
      }
    }
    
    effect(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.credentials()));
      }
    });
  }

  getCredential(apiName: string): CredentialPair[] | undefined {
    return this.credentials().find(c => c.apiName === apiName)?.pairs;
  }

  saveCredential(apiName: string, pairs: CredentialPair[]): void {
    this.credentials.update(creds => {
      const existing = creds.find(c => c.apiName === apiName);
      if (existing) {
        // Already exists, perhaps update instead? For now, we prevent duplicates.
        return creds;
      }
      return [...creds, { apiName, pairs }];
    });
  }

  updateCredential(apiName: string, updatedPairs: CredentialPair[]): void {
    this.credentials.update(creds => 
      creds.map(c => c.apiName === apiName ? { ...c, pairs: updatedPairs } : c)
    );
  }
  
  removeCredential(apiName: string): void {
    this.credentials.update(creds => creds.filter(c => c.apiName !== apiName));
  }
}
