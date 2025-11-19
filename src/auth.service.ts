

import { Injectable, signal, computed } from '@angular/core';
import { User } from './api.model';

export interface ApiConnectionSettings {
  region: string;
  timeout: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Admin & User Auth State
  currentUser = signal<User | null>({ username: 'demo', role: 'User' });
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  isUserLoggedIn = computed(() => !!this.currentUser());

  // GitHub Auth State (Simülasyon)
  isGithubLoggedIn = signal(false);

  // Admin Panel Settings
  settings = signal({
    googleDriveUrl: 'https://drive.google.com/drive/folders/1wD6_TPkVbZLav4dHWZzm27ak9XzXzI0u?usp=sharing',
    githubRepoUrl: ''
  });

  apiConnectionSettings = signal<Record<string, ApiConnectionSettings>>({});

  constructor() {
    // Örnek başlangıç ayarları
    this.apiConnectionSettings.set({
      'Google Gemini API': { region: 'global', timeout: 45000 },
      'Stripe API': { region: 'us-central1', timeout: 20000 },
      'OpenAI API': { region: 'global', timeout: 45000 },
      'Twilio API': { region: 'us-east-1', timeout: 20000 },
      'GitHub REST API': { region: 'global', timeout: 15000 },
      'GitHub GraphQL API': { region: 'global', timeout: 15000 },
      'GitHub Actions API': { region: 'global', timeout: 15000 },
      'GitHub Webhooks': { region: 'global', timeout: 15000 },
      'Spotify API': { region: 'global', timeout: 15000 },
      'Plaid API': { region: 'us', timeout: 30000 },
      'Unsplash API': { region: 'global', timeout: 20000 },
      'Tourvisio API': { region: 'tr-central-1', timeout: 40000 },
      'Slack API': { region: 'global', timeout: 15000 },
      'Shopify API': { region: 'global', timeout: 25000 },
      'HubSpot API': { region: 'global', timeout: 20000 },
      'Mailchimp API': { region: 'us-east-1', timeout: 20000 },
      'SendGrid API': { region: 'global', timeout: 20000 },
      'Jira API': { region: 'global', timeout: 25000 },
      'Trello API': { region: 'global', timeout: 15000 },
      'Asana API': { region: 'global', timeout: 20000 },
      'Notion API': { region: 'global', timeout: 20000 },
      'Airtable API': { region: 'global', timeout: 20000 },
      'Firebase API': { region: 'global', timeout: 20000 },
      'Supabase API': { region: 'global', timeout: 20000 },
      'X (Twitter) API v2': { region: 'global', timeout: 15000 },
      'Discord API': { region: 'global', timeout: 15000 },
      'Google Maps Platform': { region: 'global', timeout: 15000 },
      'Zapier API': { region: 'global', timeout: 25000 },
      'Vercel API': { region: 'global', timeout: 20000 },
      'DigitalOcean API': { region: 'global', timeout: 20000 },
      'Salesforce API': { region: 'global', timeout: 30000 },
      'YouTube Data API v3': { region: 'global', timeout: 20000 },
      'Google Analytics Data API': { region: 'global', timeout: 25000 },
      'Amazon Web Services (AWS) API': { region: 'us-east-1', timeout: 30000 },
      'Google Cloud Platform API': { region: 'global', timeout: 30000 },
      'Microsoft Azure API': { region: 'global', timeout: 30000 },
      'MongoDB Atlas API': { region: 'global', timeout: 25000 },
      'Postmark API': { region: 'global', timeout: 15000 },
      'Pusher Channels API': { region: 'global', timeout: 15000 },
      'ClickUp API': { region: 'global', timeout: 20000 },
      'Monday.com API': { region: 'global', timeout: 20000 },
      'Telegram Bot API': { region: 'global', timeout: 15000 },
      'Zoom API': { region: 'global', timeout: 25000 },
      'Make (Integromat) API': { region: 'global', timeout: 25000 },
    });
  }

  login(username: string, password: string): User | null {
    if (username === 'innovmar' && password === 'Tuba@2015Tuana') {
      const adminUser: User = { username, role: 'Admin' };
      this.currentUser.set(adminUser);
      return adminUser;
    }
    if (username === 'demo' && password === 'password') {
      const demoUser: User = { username, role: 'User' };
      this.currentUser.set(demoUser);
      return demoUser;
    }
    return null;
  }
  
  adminLogin(username: string, password: string): boolean {
    const user = this.login(username, password);
    return user?.role === 'Admin';
  }

  logout() {
    this.currentUser.set(null);
  }
  
  githubLogin() {
    this.isGithubLoggedIn.set(true);
  }

  saveSettings(driveUrl: string, repoUrl: string) {
    this.settings.set({
      googleDriveUrl: driveUrl,
      githubRepoUrl: repoUrl
    });
  }

  saveApiConnectionSettings(settings: Record<string, ApiConnectionSettings>) {
    this.apiConnectionSettings.set(settings);
  }
}