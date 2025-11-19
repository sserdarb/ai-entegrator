

import { Component, ChangeDetectionStrategy, signal, computed, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

import { GeminiService } from './gemini.service';
import { AuthService } from './auth.service';
import { LoginModalComponent } from './login-modal.component';
import { AdminPanelComponent } from './admin-panel.component';
import { ConnectionSettingsModalComponent } from './connection-settings-modal.component';
import { SafeHtmlPipe } from './safe-html.pipe';
import { ApiResponseViewerComponent } from './api-response-viewer.component';
import { ApiManagerComponent } from './api-manager.component';
import { ApiCredentialService } from './api-credential.service';
import { GeneratedIntegration, TestParam, Capability, AuthInfo, ApiInfo, User, ApiBridge } from './api.model';
import { SyntaxHighlightDirective } from './syntax-highlight.directive';
import { UserLoginModalComponent } from './user-login-modal.component';
import { ApiBridgeBuilderComponent } from './api-bridge-builder.component';


type GeneratorState = 'idle' | 'loading' | 'success' | 'error';
export type Framework = 'Angular' | 'React' | 'Vue' | 'WordPress' | 'Node.js' | 'Python';
type CapabilityTestResult = {
  status: 'idle' | 'loading' | 'success' | 'error';
  response?: any;
  fixSuggestion?: string;
  loadingFix?: boolean;
  requestUrl?: string;
  statusCode?: number;
  responseTime?: number;
};

interface ActiveFilters {
  category: string;
  sector: string;
  pricing: string;
  aiStudio: string;
}

@Component({
  selector: 'app-root',
  
  imports: [
    FormsModule,
    JsonPipe,
    LoginModalComponent,
    AdminPanelComponent,
    ConnectionSettingsModalComponent,
    SafeHtmlPipe,
    ApiResponseViewerComponent,
    ApiManagerComponent,
    SyntaxHighlightDirective,
    UserLoginModalComponent,
    ApiBridgeBuilderComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  authService = inject(AuthService);
  private geminiService = inject(GeminiService);
  apiCredentialService = inject(ApiCredentialService);

  // Theme
  theme = signal<'light' | 'dark'>('dark');

  // Modals
  isLoginModalOpen = signal(false);
  isAdminPanelOpen = signal(false);
  isApiManagerOpen = signal(false);
  isGithubLoginOpen = signal(false);
  selectedApiForSettings = signal<ApiInfo | null>(null);
  isUserLoginModalOpen = signal(false);
  isApiBridgeBuilderOpen = signal(false);

  // API Generator State
  integrationQuery = signal('');
  generatorState = signal<GeneratorState>('idle');
  loadingMessage = signal('');
  generatedIntegration = signal<GeneratedIntegration | null>(null);
  generationHistory = signal<GeneratedIntegration[]>([]);

  // Live Test State
  capabilityTestResults = signal<Record<string, CapabilityTestResult>>({});
  accessToken = signal<string | null>(null);
  authParamsForm = signal<Record<string, { value: any, valid: boolean }>>({});
  activeTestTab = signal<string>('');
  
  // API Bridges State
  apiBridges = signal<ApiBridge[]>([]);
  
  isAuthFormValid = computed(() => {
    const integration = this.generatedIntegration();
    if (!integration || integration.auth.type === 'none') return true;
    
    const formState = this.authParamsForm();
    return integration.auth.params.every(param => {
      // If param is not required, it's valid.
      if (!param.required) return true;
      // If param is required, it must have a truthy value in the form.
      return !!formState[param.name]?.value;
    });
  });

  // Export State
  selectedFramework = signal<Framework>('Angular');
  generatedCodeByFramework = signal<Partial<Record<Framework, string>>>({});
  exportState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  exportMessage = signal('');
  copiedCode = signal('');

  frameworkGroups = [
    {
      group: 'Frontend',
      frameworks: ['Angular', 'React', 'Vue'] as Framework[]
    },
    {
      group: 'Backend',
      frameworks: ['Node.js', 'Python'] as Framework[]
    },
    {
      group: 'CMS',
      frameworks: ['WordPress'] as Framework[]
    }
  ];

  // Static API List & Filtering
  apis = signal<ApiInfo[]>([
    {
      name: 'Google Gemini API',
      description: 'Google\'ın en gelişmiş üretken yapay zeka modellerine erişim sağlar. Metin, resim ve kod üretme gibi çok çeşitli görevler için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm.45 15.65a5.45 5.45 0 0 1-4.73-2.73 5.45 5.45 0 0 1 4.73-8.17 5.45 5.45 0 0 1 4.73 2.72 5.45 5.45 0 0 1-4.73 8.18Z" fill="#4285F4"/><path d="M12.45 4.8a5.45 5.45 0 0 1 4.73 2.72 5.45 5.45 0 0 1-4.73 8.18 5.45 5.45 0 0 1-4.73-2.73 5.45 5.45 0 0 1 4.73-8.17Z" fill="#FBBC05"/><path d="M12.45 4.8a5.45 5.45 0 0 1 4.73 2.72c-1.48 1.48-2.73 3.2-4.73 2.72-2-.47-2.73-2.25-2.73-4.73a5.45 5.45 0 0 1 2.73-1.71Z" fill="#EA4335"/><path d="M12 12c-2.48 0-4.73 1.25-4.73 2.73s2.25 4.72 4.73 4.72 4.73-3.25 4.73-2.72-2.25-4.73-4.73-4.73Z" fill="#34A853"/></svg>',
      url: 'https://ai.google.dev/docs',
      category: 'Yapay Zeka',
      sectors: ['Teknoloji', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Cömert bir ücretsiz katman ve kullanıma dayalı ücretlendirme sunar.', details: ['Flash modeli için 1M token/dakika ücretsiz.'] },
      pricingType: 'Ücretli',
      integrationTip: 'Gemini 2.5 Pro modelini karmaşık, çok adımlı görevler için kullanın. "Thinking mode" ile daha iyi sonuçlar alabilirsiniz.',
      apiKeyGuide: { description: 'Google AI Studio\'ya giderek "Get API key" butonuna tıklayın ve yeni bir proje için anahtar oluşturun.', url: 'https://aistudio.google.com/app/apikey' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'import { GoogleGenerativeAI } from "@google/generative-ai";\nconst genAI = new GoogleGenerativeAI("YOUR_API_KEY");\n\nasync function run() {\n  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});\n  const prompt = "Bana bir şaka söyle";\n  const result = await model.generateContent(prompt);\n  console.log(result.response.text());\n}\n\nrun();' },
    },
    {
      name: 'Stripe API',
      description: 'Web siteleri ve mobil uygulamalar için güçlü bir ödeme işleme platformu. Abonelikler, tek seferlik ödemeler ve daha fazlasını yönetin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.87,15.21l-3.25,3.25a.81.81,0,0,1-1.14,0l-3.25-3.25a.81.81,0,0,1,0-1.14l3.25-3.25a.81.81,0,0,1,1.14,0l3.25,3.25A.81.81,0,0,1,17.87,15.21Z" fill="#6772e5"/><path d="M10.23,19.6a.81.81,0,0,1,0-1.14l3.25-3.25a.81.81,0,0,1,1.14,0l3.25,3.25a.81.81,0,0,1,0,1.14l-3.25,3.25a.81.81,0,0,1-1.14,0Z" fill="#6772e5" opacity="0.6"/><path d="M13.48,1.15,10.23,4.4a.81.81,0,0,0,0,1.14l3.25,3.25a.81.81,0,0,0,1.14,0L21,5.54a.81.81,0,0,0,0-1.14L14.62,1.15A.81.81,0,0,0,13.48,1.15Z" fill="#6772e5" opacity="0.8"/></svg>',
      url: 'https://stripe.com/docs/api',
      category: 'Ödeme Sistemleri',
      sectors: ['E-Ticaret', 'Finans', 'SaaS'],
      status: 'aktif',
      pricing: { summary: 'İşlem başına komisyon alır.', details: ['Başarılı kart işlemi başına %2.9 + 30¢.'] },
      pricingType: 'Ücretli',
      integrationTip: 'Webhookları kullanarak ödeme durumları (başarılı, başarısız vb.) hakkında anında bildirim alın. Bu, sipariş yönetimini otomatikleştirir.',
      apiKeyGuide: { description: 'Stripe Dashboard\'a gidin, "Geliştiriciler" > "API Anahtarları" bölümünden test ve canlı anahtarlarınıza erişin.', url: 'https://dashboard.stripe.com/apikeys' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const stripe = require(\'stripe\')(\'YOUR_SECRET_KEY\');\n\nasync function createPaymentIntent() {\n  const paymentIntent = await stripe.paymentIntents.create({\n    amount: 2000,\n    currency: \'usd\',\n  });\n  console.log(paymentIntent.client_secret);\n}\n\ncreatePaymentIntent();' },
    },
    {
      name: 'OpenAI API',
      description: 'GPT-4, DALL-E gibi güçlü yapay zeka modellerine erişim sağlar. Doğal dil işleme, metin üretimi ve resim oluşturma için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2A9.91,9.91,0,0,0,3.27,6.2,9.91,9.91,0,0,0,2,12a9.91,9.91,0,0,0,1.27,5.8A9.91,9.91,0,0,0,12,22a9.91,9.91,0,0,0,8.73-5.8A9.91,9.91,0,0,0,22,12a9.91,9.91,0,0,0-1.27-5.8A9.91,9.91,0,0,0,12,2Zm4.7,12.9a4.83,4.83,0,0,1-1.2.9,4.45,4.45,0,0,1-1.4.3,4.19,4.19,0,0,1-1.6-.3,4.64,4.64,0,0,1-1.3-.9,4.28,4.28,0,0,1-.9-1.3,4.19,4.19,0,0,1-.3-1.6,4.19,4.19,0,0,1,.3-1.6,4.28,4.28,0,0,1,.9-1.3,4.64,4.64,0,0,1,1.3-.9,4.19,4.19,0,0,1,1.6-.3,4.19,4.19,0,0,1,1.6.3,4.64,4.64,0,0,1,1.3.9,4.28,4.28,0,0,1,.9,1.3,4.19,4.19,0,0,1,.3,1.6,4.19,4.19,0,0,1-.3,1.6A4.28,4.28,0,0,1,16.7,14.9Z" fill="currentColor"/></svg>',
      url: 'https://platform.openai.com/docs',
      category: 'Yapay Zeka',
      sectors: ['Teknoloji', 'Yazılım', 'İçerik Üretimi'],
      status: 'aktif',
      pricing: { summary: 'Kullanıma dayalı (token bazlı) ücretlendirme.', details: ['GPT-4o: $5.00 / 1M input token.', 'DALL-E 3: $0.040 / resim.'] },
      pricingType: 'Ücretli',
      integrationTip: 'Maliyetleri kontrol altında tutmak için isteklerinizde `max_tokens` parametresini kullanın. `temperature` parametresi ile çıktının ne kadar yaratıcı olacağını ayarlayabilirsiniz.',
      apiKeyGuide: { description: 'OpenAI Platform hesabınıza giriş yapın. Sol menüden "API keys" bölümüne gidin ve yeni bir gizli anahtar oluşturun.', url: 'https://platform.openai.com/api-keys' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const OpenAI = require(\'openai\');\nconst openai = new OpenAI({ apiKey: \'YOUR_API_KEY\' });\n\nasync function main() {\n  const completion = await openai.chat.completions.create({\n    messages: [{ role: \'system\', content: \'You are a helpful assistant.\' }],\n    model: \'gpt-4o\',\n  });\n  console.log(completion.choices[0]);\n}\n\nmain();' },
    },
    {
      name: 'Twilio API',
      description: 'Uygulamalarınıza SMS, sesli arama, WhatsApp ve video özellikleri eklemenizi sağlayan bir iletişim platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#F22F46"/><circle cx="12" cy="12" r="6" fill="#F22F46"/></svg>',
      url: 'https://www.twilio.com/docs',
      category: 'İletişim',
      sectors: ['SaaS', 'Pazarlama', 'Müşteri Hizmetleri'],
      status: 'aktif',
      pricing: { summary: 'Kullanıma dayalı ücretlendirme.', details: ['SMS gönderme: ~$0.0079 / mesaj.', 'Telefon numarası kiralama: ~$1.15 / ay.'] },
      pricingType: 'Ücretli',
      integrationTip: 'Telefon numarası satın alırken, hedef kitlenizin bulunduğu ülkede yerel bir numara seçmek, teslimat oranlarını ve güveni artırır.',
      apiKeyGuide: { description: 'Twilio Console\'a giriş yapın. Ana panelde "Account SID" ve "Auth Token" bilgilerinizi bulabilirsiniz.', url: 'https://console.twilio.com' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const accountSid = \'YOUR_ACCOUNT_SID\';\nconst authToken = \'YOUR_AUTH_TOKEN\';\nconst client = require(\'twilio\')(accountSid, authToken);\n\nclient.messages\n  .create({\n     body: \'This is a test message!\',\n     from: \'+15017122661\',\n     to: \'+15558675310\'\n   })\n  .then(message => console.log(message.sid));' },
    },
    {
      name: 'GitHub REST API',
      description: 'GitHub depoları, kullanıcılar, issue\'lar ve daha fazlası hakkında verilere programatik olarak erişmenizi sağlar.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.57.69.48A10 10 0 0 0 12 2Z" fill="currentColor"/></svg>',
      url: 'https://docs.github.com/en/rest',
      category: 'Geliştirici Araçları',
      sectors: ['Yazılım', 'Teknoloji'],
      status: 'aktif',
      pricing: { summary: 'Cömert bir ücretsiz kullanım limiti sunar.', details: ['Kimlik doğrulaması olmadan: 60 istek/saat.', 'Kimlik doğrulaması ile: 5000 istek/saat.'] },
      pricingType: 'Ücretsiz',
      integrationTip: 'Hız limitlerine takılmamak için kimlik doğrulaması yapın. Bir "Personal Access Token" oluşturmak en kolay yoldur.',
      apiKeyGuide: { description: 'GitHub ayarlarınıza gidin, "Developer settings" > "Personal access tokens" bölümünden yeni bir token oluşturun.', url: 'https://github.com/settings/tokens' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const { Octokit } = require("@octokit/rest");\n\nconst octokit = new Octokit({ auth: `YOUR_PERSONAL_ACCESS_TOKEN` });\n\nasync function getUser() {\n  const { data: user } = await octokit.rest.users.getAuthenticated();\n  console.log(user);\n}\n\ngetUser();' },
    },
    {
      name: 'GitHub GraphQL API',
      description: 'Tek bir istekte birden çok ve karmaşık veriyi verimli bir şekilde çekmek için modern bir API.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.57.69.48A10 10 0 0 0 12 2Z" fill="#e535ab"/></svg>',
      url: 'https://docs.github.com/en/graphql',
      category: 'Geliştirici Araçları',
      sectors: ['Yazılım', 'Teknoloji'],
      status: 'aktif',
      pricing: { summary: 'REST API ile aynı ücretsiz kullanım limitlerini paylaşır.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'GraphQL, ihtiyacınız olan veriyi tam olarak belirtmenize olanak tanır, bu da onu REST\'e göre daha verimli kılar. "Explorer" aracını kullanarak sorgularınızı test edin.',
      apiKeyGuide: { description: 'REST API ile aynı Kişisel Erişim Jetonunu (Personal Access Token) kullanır.', url: 'https://github.com/settings/tokens' },
      aiStudioRecommended: true,
      codeExample: { language: 'GraphQL', code: 'query {\n  viewer {\n    login\n    repositories(first: 10) {\n      nodes {\n        name\n      }\n    }\n  }\n}' },
    },
    {
      name: 'GitHub Actions API',
      description: 'CI/CD süreçlerinizi ve otomasyon iş akışlarınızı programatik olarak yönetin, izleyin ve tetikleyin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.57.69.48A10 10 0 0 0 12 2Z" fill="#2088FF"/></svg>',
      url: 'https://docs.github.com/en/rest/actions',
      category: 'Geliştirici Araçları',
      sectors: ['Yazılım', 'DevOps', 'Otomasyon'],
      status: 'aktif',
      pricing: { summary: 'Genellikle GitHub aboneliği ile birlikte gelen limitler dahilinde ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Bir iş akışını manuel olarak tetiklemek için `workflow_dispatch` olayını kullanabilirsiniz. Bu, harici sistemlerden Actions\'ı başlatmak için kullanışlıdır.',
      apiKeyGuide: { description: 'REST API ile aynı Kişisel Erişim Jetonunu (Personal Access Token) kullanır. `workflow` yetki kapsamını (scope) eklediğinizden emin olun.', url: 'https://github.com/settings/tokens' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl -X POST -H "Accept: application/vnd.github.v3+json" -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/dispatches -d \'{"ref":"main"}\'' },
    },
    {
      name: 'GitHub Webhooks',
      description: 'Deponuzda bir olay (push, pull request vb.) olduğunda diğer servislere anında HTTP POST bildirimleri gönderir.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.57.69.48A10 10 0 0 0 12 2Z" fill="#FBAB4A"/></svg>',
      url: 'https://docs.github.com/en/webhooks',
      category: 'Geliştirici Araçları',
      sectors: ['Yazılım', 'Otomasyon', 'CI/CD'],
      status: 'aktif',
      pricing: { summary: 'Ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Güvenlik için webhook\'larınıza bir "Secret" ekleyin. GitHub, her isteği bu secret ile imzalayarak isteğin gerçekten GitHub\'dan geldiğini doğrulamanızı sağlar.',
      apiKeyGuide: { description: 'API anahtarı gerektirmez. Depo ayarlarınızın "Webhooks" bölümünden, bildirimlerin gönderileceği URL\'yi yapılandırabilirsiniz.', url: 'https://github.com/OWNER/REPO/settings/hooks' },
      aiStudioRecommended: true,
      codeExample: { language: 'JSON', code: '{\n  "ref": "refs/heads/main",\n  "before": "...",\n  "after": "...",\n  "repository": { ... },\n  "pusher": { ... },\n  "commits": [ ... ]\n}' },
    },
    {
      name: 'Spotify API',
      description: 'Spotify\'ın geniş müzik kataloğuna, çalma listelerine, sanatçı ve albüm bilgilerine erişim sağlar.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.19 14.19c-.21.33-.64.43-.97.22-2.73-1.68-6.18-2.07-10.26-.97-.4.1-.8-.13-.9-.53s.13-.8.53-.9c4.46-1.18 8.28-.73 11.36 1.15.33.21.43.64.22.97zM17.8 12.3c-.27.41-.8.54-1.21.27-3.22-1.95-8.23-2.52-11.75-1.38-.49.16-.99-.14-1.15-.63s.14-.99.63-1.15c4.02-1.28 9.53-.64 13.25 1.58.41.27.54.8.27 1.21zm.2-2.88c-.33.51-1 .66-1.51.33-3.6-2.22-9.53-2.43-13.23-1.34-.58.17-1.18-.21-1.35-.78s.21-1.18.78-1.35c4.22-1.2 10.78-.93 14.96 1.58.51.33.66 1 .33 1.51z" fill="#1DB954"/></svg>',
      url: 'https://developer.spotify.com/documentation/web-api/',
      category: 'Müzik & Medya',
      sectors: ['Eğlence', 'Sosyal Medya'],
      status: 'aktif',
      pricing: { summary: 'Geliştiriciler için ücretsizdir.', details: [] },
      pricingType: 'Ücretsiz',
      integrationTip: 'Spotify API, OAuth 2.0 kullanır. Kullanıcı adına işlem yapmak için önce yetki almanız gerekir. Başlamak için "Client Credentials" akışı en basitidir.',
      apiKeyGuide: { description: 'Spotify Developer Dashboard\'a gidin, bir uygulama oluşturun. Uygulama sayfasında "Client ID" ve "Client Secret" bilgilerinizi bulacaksınız.', url: 'https://developer.spotify.com/dashboard' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const clientId = \'YOUR_CLIENT_ID\';\nconst clientSecret = \'YOUR_CLIENT_SECRET\';\n\nconst getToken = async () => {\n  const result = await fetch(\'https://accounts.spotify.com/api/token\', {\n    method: \'POST\',\n    headers: {\n      \'Content-Type\' : \'application/x-www-form-urlencoded\',\n      \'Authorization\' : \'Basic \' + btoa(clientId + \':\' + clientSecret)\n    },\n    body: \'grant_type=client_credentials\'\n  });\n  const data = await result.json();\n  return data.access_token;\n};\n\ntoken = await getToken();' },
    },
    {
      name: 'Plaid API',
      description: 'Kullanıcıların banka hesaplarını uygulamalarınıza güvenli bir şekilde bağlamalarını sağlayan bir finansal teknoloji platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.99 7.15c-1.22-1.42-3.13-2.14-5.26-1.95-.29.03-.58.07-.86.13-1.33.25-2.58.82-3.64 1.63L2.58 16.5c-1.55.97-1.89 3.12-.79 4.54l.01.01c1.1 1.43 3.12 1.89 4.54.79l10.65-6.7c.97-1.55 1.89-3.12 2.79-4.54.1-.15.19-.3.28-.46z" fill="#00a3e0"/><path d="M2.31 6.88c.15-1.1.86-2.02 1.83-2.43 1.1-.48 2.34-.33 3.29.39l10.65 6.7c1.55.97 1.89 3.12-.79 4.54l-.01.01c-1.1 1.42-3.12 1.89-4.54.79l-10.66-6.7c-.96-1.55-1.88-3.12-2.78-4.54a1.05 1.05 0 0 1 .43-.26z" fill="#004e7c"/></svg>',
      url: 'https://plaid.com/docs/',
      category: 'Finans',
      sectors: ['Finans', 'Fintech', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Kullanıma dayalı ve aylık abonelik planları sunar.', details: ['Geliştirici Sandbox\'ı ücretsizdir.'] },
      pricingType: 'Ücretli',
      integrationTip: 'Plaid Link, kullanıcıların hesaplarını bağlaması için güvenli ve kullanıcı dostu bir ön uç modülüdür. Entegrasyonunuzun temeli bu olmalıdır.',
      apiKeyGuide: { description: 'Plaid Dashboard\'a kaydolun. "Team Settings" -> "Keys" bölümünden sandbox, development ve production anahtarlarınıza erişin.', url: 'https://dashboard.plaid.com/team/keys' },
      aiStudioRecommended: false,
      codeExample: { language: 'JavaScript', code: 'const { PlaidApi, PlaidEnvironments } = require(\'plaid\');\n\nconst plaidClient = new PlaidApi({\n  clientID: \'YOUR_CLIENT_ID\',\n  secret: \'YOUR_SANDBOX_SECRET\',\n  env: PlaidEnvironments.sandbox,\n});\n\nasync function createLinkToken() {\n  const response = await plaidClient.createLinkToken({/*...*/});\n  console.log(response.link_token);\n}' },
    },
    {
      name: 'Unsplash API',
      description: 'Yüksek çözünürlüklü, ücretsiz kullanılabilen geniş bir fotoğraf arşivine erişim sağlar.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.5 10.75V0h-5v10.75h5zM19 13.25H5v10.75h14V13.25z" fill="currentColor"/></svg>',
      url: 'https://unsplash.com/documentation',
      category: 'Görsel Medya',
      sectors: ['Tasarım', 'İçerik Üretimi', 'Web Geliştirme'],
      status: 'aktif',
      pricing: { summary: 'Geliştiriciler için ücretsizdir.', details: ['Demo: 50 istek/saat.', 'Prodüksiyon: 5000 istek/saat.'] },
      pricingType: 'Ücretsiz',
      integrationTip: 'Kullanıcıları fotoğrafın kaynağına (Unsplash fotoğrafçısı) yönlendiren bir link eklemek, Unsplash API kullanım koşulları gereğince zorunludur.',
      apiKeyGuide: { description: 'Unsplash Developers\'a kaydolun, yeni bir uygulama oluşturun. Uygulama ayarlarında "Access Key" anahtarınızı bulacaksınız.', url: 'https://unsplash.com/oauth/applications' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const accessKey = "YOUR_ACCESS_KEY";\nconst query = "mountains";\n\nfetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=${accessKey}`)\n  .then(response => response.json())\n  .then(data => {\n    console.log(data.results[0].urls.regular);\n  });' },
    },
    {
      name: 'Tourvisio API',
      description: 'Turizm ve seyahat acenteleri için otel, tur ve transfer verilerine erişim sağlayan bir B2B API platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.93,11.3,13.8,3.17a2.59,2.59,0,0,0-3.6,0L2.07,11.3a2.59,2.59,0,0,0,0,3.6l8.13,8.13a2.59,2.59,0,0,0,3.6,0l8.13-8.13A2.59,2.59,0,0,0,21.93,11.3ZM12,19.83,5.17,13,12,6.17,18.83,13Z" fill="#007BFF"/></svg>',
      url: 'https://www.tourvisio.com/api-documentation',
      category: 'Seyahat & Turizm',
      sectors: ['Seyahat & Turizm'],
      status: 'aktif',
      pricing: { summary: 'İş ortaklığı ve lisanslama modeline dayanır.' },
      pricingType: 'Ücretli',
      integrationTip: 'Tourvisio, genellikle `AgencyCode`, `LoginName`, ve `Password` gibi çoklu kimlik bilgisi gerektirir. API anahtarı yerine bu bilgileri kullanmalısınız.',
      apiKeyGuide: { description: 'Tourvisio ile iş ortağı olmak için doğrudan iletişime geçin. Size özel kimlik bilgileriniz ve API erişim detaylarınız sağlanacaktır.', url: 'https://www.tourvisio.com/contact' },
      aiStudioRecommended: false,
      codeExample: { language: 'JavaScript', code: 'const credentials = {\n  AgencyCode: "YOUR_AGENCY_CODE",\n  LoginName: "YOUR_LOGIN_NAME",\n  Password: "YOUR_PASSWORD"\n};\n\nasync function searchHotels() {\n  const response = await fetch("https://api.tourvisio.com/v2/SearchHotels", {\n    method: "POST",\n    headers: {\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify({ ...credentials, /* ...search params */ })\n  });\n  const data = await response.json();\n  console.log(data);\n}\n\nsearchHotels();' },
    },
    {
      name: 'Slack API',
      description: 'Slack çalışma alanlarına mesaj göndermek, kanalları yönetmek ve botlar oluşturmak için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.3,14.7a1.9,1.9,0,0,0-1.9-1.9H3.6a1.9,1.9,0,0,0,0,3.8H7.4A1.9,1.9,0,0,0,9.3,14.7Z" fill="#36C5F0"/><path d="M10.7,14.7a1.9,1.9,0,0,0,1.9-1.9V9.3a1.9,1.9,0,0,0-3.8,0V12.8A1.9,1.9,0,0,0,10.7,14.7Z" fill="#2EB67D"/><path d="M9.3,9.3a1.9,1.9,0,0,0,1.9,1.9h3.8a1.9,1.9,0,0,0,0-3.8H11.2A1.9,1.9,0,0,0,9.3,9.3Z" fill="#ECB22E"/><path d="M14.7,9.3a1.9,1.9,0,0,0-1.9,1.9v3.8a1.9,1.9,0,0,0,3.8,0V11.2A1.9,1.9,0,0,0,14.7,9.3Z" fill="#E01E5A"/></svg>',
      url: 'https://api.slack.com/',
      category: 'İş Araçları',
      sectors: ['Yazılım', 'İletişim'],
      status: 'aktif',
      pricing: { summary: 'Cömert bir ücretsiz kullanım limiti sunar.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Başlamak için en kolay yol, "Incoming Webhooks" kullanmaktır. Bu, herhangi bir uygulamadan belirli bir kanala kolayca mesaj göndermenizi sağlar.',
      apiKeyGuide: { description: 'Slack API web sitesine gidin, "Your Apps" bölümünden yeni bir uygulama oluşturun. Uygulama ayarlarından bot token\'ınıza erişebilirsiniz.', url: 'https://api.slack.com/apps' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const { WebClient } = require(\'@slack/web-api\');\n\nconst web = new WebClient(\'YOUR_BOT_TOKEN\');\n\n(async () => {\n  await web.chat.postMessage({\n    channel: \'#general\',\n    text: \'Hello, world!\',\n  });\n})();' },
    },
    {
      name: 'Shopify API',
      description: 'Shopify mağazalarının ürünlerine, siparişlerine ve müşteri verilerine erişmek ve yönetmek için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.8,7.2H5.2A3.2,3.2,0,0,0,2,10.4v8.4A3.2,3.2,0,0,0,5.2,22h13.6A3.2,3.2,0,0,0,22,18.8V10.4A3.2,3.2,0,0,0,18.8,7.2Zm-6.8,9a3.1,3.1,0,0,1-3.1-3.1A3,3,0,0,1,12,10.1a3,3,0,0,1,3.1,3.1A3.1,3.1,0,0,1,12,16.2ZM12,2a4.8,4.8,0,0,0-4.8,4.8v.3h9.6v-.3A4.8,4.8,0,0,0,12,2Z" fill="#95BF47"/></svg>',
      url: 'https://shopify.dev/docs/api',
      category: 'E-Ticaret',
      sectors: ['E-Ticaret', 'Perakende'],
      status: 'aktif',
      pricing: { summary: 'Genellikle Shopify aboneliği olan geliştiriciler için ücretsizdir.' },
      pricingType: 'Ücretli',
      integrationTip: 'GraphQL API, REST API\'ye göre daha esnektir ve yalnızca ihtiyacınız olan veriyi almanızı sağlar. Yeni projeler için GraphQL\'i tercih edin.',
      apiKeyGuide: { description: 'Shopify Partner hesabınıza giriş yapın. "Apps" bölümünden yeni bir uygulama oluşturun. Uygulama ayarlarında API anahtarı ve gizli anahtarınızı bulacaksınız.', url: 'https://partners.shopify.com/' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const shopify = new Shopify.Clients.Rest({\n    shop: \'your-shop-name.myshopify.com\',\n    accessToken: \'YOUR_ACCESS_TOKEN\',\n});\n\nasync function getProducts() {\n    const products = await shopify.get({ path: \'products\' });\n    console.log(products.body.products);\n}' },
    },
    {
      name: 'HubSpot API',
      description: 'Müşteri ilişkileri, pazarlama otomasyonu ve satış süreçlerini yönetmek için hepsi bir arada platform.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FF7A59" d="M15.12 2.44A10 10 0 003.5 14.88a10 10 0 0017-7.33 10 10 0 00-5.38-5.11zM12 18.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z"/><path fill="#FF7A59" d="M12 9a3 3 0 100 6 3 3 0 000-6z"/></svg>',
      url: 'https://developers.hubspot.com/',
      category: 'Pazarlama & CRM',
      sectors: ['Pazarlama', 'Satış', 'SaaS'],
      status: 'aktif',
      pricing: { summary: 'Ücretsiz araçlar ve çeşitli ücretli katmanlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'OAuth 2.0 kullanır. Geliştirici hesabınızda bir uygulama oluşturarak başlayın ve gerekli yetki kapsamlarını (scopes) isteyin.',
      apiKeyGuide: { description: 'HubSpot Geliştirici Hesabı oluşturun, bir uygulama yaratın ve uygulamanızın kimlik bilgilerine erişin.', url: 'https://app.hubspot.com/signup/developers' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const hubspot = require(\'@hubspot/api-client\');\n\nconst hubspotClient = new hubspot.Client({ accessToken: \'YOUR_ACCESS_TOKEN\' });\n\nasync function getContacts() {\n  const contacts = await hubspotClient.crm.contacts.getAll();\n  console.log(contacts);\n}' },
    },
    {
      name: 'Mailchimp API',
      description: 'E-posta pazarlama kampanyaları oluşturun, kitleleri yönetin ve kampanya sonuçlarını analiz edin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFE01B" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 8v-6h2v6h-2z" fill="#241C15"/></svg>',
      url: 'https://mailchimp.com/developer/',
      category: 'Pazarlama & CRM',
      sectors: ['Pazarlama', 'E-Ticaret'],
      status: 'aktif',
      pricing: { summary: 'Abonelik planlarına göre değişen ücretsiz ve ücretli katmanlar.' },
      pricingType: 'Ücretli',
      integrationTip: 'API Anahtarınızı, ait olduğu veri merkezi (datacenter) URL\'si ile birlikte kullanmanız gerekir (örn: `us19.api.mailchimp.com`).',
      apiKeyGuide: { description: 'Mailchimp hesabınıza gidin, "Account" > "Extras" > "API keys" bölümünden yeni bir anahtar oluşturun.', url: 'https://us1.admin.mailchimp.com/account/api/' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const mailchimp = require(\'@mailchimp/mailchimp_marketing\');\n\nmailchimp.setConfig({\n  apiKey: \'YOUR_API_KEY\',\n  server: \'YOUR_SERVER_PREFIX\', // e.g. us19\n});\n\nasync function getLists() {\n  const response = await mailchimp.lists.getAllLists();\n  console.log(response.lists);\n}\n\ngetLists();' },
    },
    {
      name: 'SendGrid API',
      description: 'İşlem e-postaları (şifre sıfırlama, fatura vb.) ve pazarlama e-postaları göndermek için güvenilir bir platform.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3.28 12.36L12 11.2l3.28 3.16a.75.75 0 11-1.06 1.06L12 12.26l-2.22 2.16a.75.75 0 01-1.06-1.06zM8.72 9.64L12 12.8l3.28-3.16a.75.75 0 111.06 1.06L12 13.92l-4.34-4.22a.75.75 0 011.06-1.06z" fill="#2F81F7"/></svg>',
      url: 'https://docs.sendgrid.com/',
      category: 'Pazarlama & CRM',
      sectors: ['SaaS', 'Yazılım', 'Pazarlama'],
      status: 'aktif',
      pricing: { summary: 'Ücretsiz plan ve kullanıma dayalı ücretli planlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Tek bir API Anahtarı yeterlidir. Bu anahtarı `Authorization: Bearer YOUR_API_KEY` başlığında gönderin.',
      apiKeyGuide: { description: 'SendGrid hesabınıza giriş yapın, "Settings" > "API Keys" bölümünden yeni bir API anahtarı oluşturun.', url: 'https://app.sendgrid.com/settings/api_keys' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const sgMail = require(\'@sendgrid/mail\');\nsgMail.setApiKey(\'YOUR_SENDGRID_API_KEY\');\n\nconst msg = {\n  to: \'test@example.com\',\n  from: \'test@example.com\',\n  subject: \'Sending with SendGrid is Fun\',\n  text: \'and easy to do anywhere, even with Node.js\',\n};\n\nsgMail.send(msg).then(() => console.log(\'Email sent\'));' },
    },
    {
      name: 'Salesforce API',
      description: 'Müşteri verileri, satış süreçleri ve özel nesneler dahil olmak üzere Salesforce verilerinize ve işlevlerinize erişin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#00A1E0" d="M6.6 3h10.8c.9 0 1.6.7 1.6 1.6v2.8c0 .4-.2.8-.5 1.1-.3.3-.7.5-1.1.5h-2.8c-.9 0-1.6-.7-1.6-1.6V4.6c0-.9-.7-1.6-1.6-1.6H6.6c-.4 0-.8-.2-1.1-.5C5.2 3.8 5 3.4 5 3v0c0-1.4 1.1-2.5 2.5-2.5h.1z"/><path fill="#00A1E0" d="M11.6 12.4c.9 0 1.6.7 1.6 1.6v2.8c0 .9.7 1.6 1.6 1.6h2.8c.4 0 .8.2 1.1.5.3.3.5.7.5 1.1v.1c0 1.4-1.1 2.5-2.5 2.5H6.6c-.9 0-1.6-.7-1.6-1.6V14c0-.9.7-1.6 1.6-1.6h3.4z"/></svg>',
      url: 'https://developer.salesforce.com/docs/apis/',
      category: 'Pazarlama & CRM',
      sectors: ['Satış', 'Pazarlama', 'Kurumsal Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Salesforce aboneliği gerektirir. API kullanımı genellikle limitler dahilinde ücretsizdir.' },
      pricingType: 'Ücretli',
      integrationTip: 'Salesforce, REST, SOAP, Bulk ve Streaming dahil olmak üzere birden çok API sunar. Veri senkronizasyonu için Bulk API\'yi kullanın.',
      apiKeyGuide: { description: 'Salesforce kurulumunuzda, \'Setup\' > \'Apps\' > \'App Manager\' bölümünden bir \'Connected App\' oluşturarak API anahtarlarınızı alın.', url: 'https://login.salesforce.com/' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: '# First, get an access token via OAuth 2.0\ncurl "https://MyDomainName.my.salesforce.com/services/data/v53.0/sobjects/Account/" \\\n-H "Authorization: Bearer YOUR_ACCESS_TOKEN"' },
    },
    {
      name: 'Jira API',
      description: 'Proje yönetimi, sorun takibi ve iş akışı otomasyonu için Agile takımların kullandığı popüler bir araç.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64 9.36a.75.75 0 00-1.28-.53L12 15.66 3.64 8.83a.75.75 0 10-1.28 1.06l9 7.5a.75.75 0 001.28 0l9-7.5a.75.75 0 000-1.06z" fill="#2684FF"/></svg>',
      url: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
      category: 'İş Araçları',
      sectors: ['Yazılım', 'Proje Yönetimi'],
      status: 'aktif',
      pricing: { summary: 'Genellikle Jira aboneliği olan geliştiriciler için ücretsizdir.' },
      pricingType: 'Ücretli',
      integrationTip: 'Temel kimlik doğrulama (e-posta ve API token) veya OAuth kullanır. API token oluşturmak, şifrenizi kullanmaktan daha güvenlidir.',
      apiKeyGuide: { description: 'Atlassian hesabınıza gidin, "Security" > "API token" bölümünden yeni bir token oluşturun.', url: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl -u your-email@example.com:<api_token> \\\n   -X GET \\\n   -H "Content-Type: application/json" \\\n   https://your-domain.atlassian.net/rest/api/3/project' },
    },
    {
      name: 'Trello API',
      description: 'Kanban panoları ile görevleri ve projeleri görsel olarak organize etmenizi sağlayan esnek bir işbirliği aracı.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#0079BF"/><rect x="7" y="7" width="4" height="10" fill="white"/><rect x="13" y="7" width="4" height="6" fill="white"/></svg>',
      url: 'https://developer.atlassian.com/cloud/trello/rest/',
      category: 'İş Araçları',
      sectors: ['Proje Yönetimi', 'Verimlilik'],
      status: 'aktif',
      pricing: { summary: 'Ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Bir API Anahtarı ve kullanıcı bazlı bir Token gerektirir. İkisini de URL parametresi olarak (`?key=...&token=...`) gönderebilirsiniz.',
      apiKeyGuide: { description: 'Trello hesabınıza giriş yapın, `https://trello.com/app-key` adresine giderek anahtarınızı alın ve aynı sayfadan token oluşturun.', url: 'https://trello.com/app-key' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const apiKey = \'YOUR_API_KEY\';\nconst token = \'YOUR_TOKEN\';\nconst boardId = \'YOUR_BOARD_ID\';\n\nfetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${token}`)\n  .then(res => res.json())\n  .then(cards => console.log(cards));' },
    },
    {
      name: 'Asana API',
      description: 'Takımların işlerini planlamaları, organize etmeleri ve takip etmeleri için bir iş yönetimi platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FB4F4F"/><circle cx="9" cy="12" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/></svg>',
      url: 'https://developers.asana.com/docs',
      category: 'İş Araçları',
      sectors: ['Proje Yönetimi', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Asana aboneliği olan geliştiriciler için ücretsizdir.' },
      pricingType: 'Ücretli',
      integrationTip: 'Kimlik doğrulaması için Kişisel Erişim Jetonu (Personal Access Token) kullanır. Bu jetonu Bearer token olarak gönderin.',
      apiKeyGuide: { description: 'Asana Geliştirici Konsolu\'na gidin, "Personal Access Tokens" bölümünden yeni bir token oluşturun.', url: 'https://app.asana.com/0/my-apps' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const accessToken = \'YOUR_PERSONAL_ACCESS_TOKEN\';\n\nfetch(\'https://app.asana.com/api/1.0/users/me\', {\n  headers: {\n    \'Authorization\': `Bearer ${accessToken}`\n  }\n})\n.then(res => res.json())\n.then(user => console.log(user.data));' },
    },
    {
      name: 'Notion API',
      description: 'Notlar, görevler, veritabanları ve daha fazlasını oluşturmak için hepsi bir arada bir çalışma alanı.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.4 3H6.6A1.6 1.6 0 005 4.6v14.8A1.6 1.6 0 006.6 21h10.8a1.6 1.6 0 001.6-1.6V7.2L14.4 3zM8 12h8m-8 4h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      url: 'https://developers.notion.com/',
      category: 'İş Araçları',
      sectors: ['Verimlilik', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Entegrasyon Jetonu (Integration Token) gereklidir. Notion\'da bir \'entegrasyon\' oluşturarak elde edilir ve bu entegrasyonu erişmesini istediğiniz sayfalarda paylaşmanız gerekir.',
      apiKeyGuide: { description: 'Notion hesabınıza gidin, "My Integrations" bölümünden yeni bir entegrasyon oluşturun ve "Internal Integration Token"ı kopyalayın.', url: 'https://www.notion.so/my-integrations' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const { Client } = require(\'@notionhq/client\');\n\nconst notion = new Client({ auth: \'YOUR_NOTION_TOKEN\' });\n\n(async () => {\n  const databaseId = \'YOUR_DATABASE_ID\';\n  const response = await notion.databases.query({ database_id: databaseId });\n  console.log(response.results);\n})();' },
    },
    {
      name: 'Airtable API',
      description: 'Bir elektronik tablonun esnekliğini bir veritabanının gücüyle birleştiren bir platform.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.71 11.29l-9-9a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42l9 9a1 1 0 001.42 0l9-9a1 1 0 000-1.42zM12 19.59L4.41 12 12 4.41 19.59 12 12 19.59z" fill="#FBCB43"/><path d="M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill="#FBCB43"/></svg>',
      url: 'https://airtable.com/developers/web/api/introduction',
      category: 'İş Araçları',
      sectors: ['Verimlilik', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Ücretsiz plan ve çeşitli ücretli katmanlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Her \'base\' (veritabanı) için ayrı bir API anahtarı vardır. Bu anahtarı Bearer token olarak kullanırsınız. API dokümantasyonu her base için özel olarak üretilir.',
      apiKeyGuide: { description: 'Airtable hesabınıza gidin, "Account" sayfasından kişisel API anahtarınızı oluşturun veya kopyalayın.', url: 'https://airtable.com/account' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const apiKey = \'YOUR_API_KEY\';\nconst baseId = \'YOUR_BASE_ID\';\nconst table = \'YOUR_TABLE_NAME\';\n\nfetch(`https://api.airtable.com/v0/${baseId}/${table}`,\n  { headers: { Authorization: `Bearer ${apiKey}` } })\n.then(res => res.json())\n.then(records => console.log(records));' },
    },
    {
      name: 'Firebase API',
      description: 'Google\'ın mobil ve web uygulamaları geliştirmek için sunduğu kapsamlı bir platform. Gerçek zamanlı veritabanı, kimlik doğrulama, hosting ve daha fazlasını içerir.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.18 17.15L4 15.23l7.5-12.38 1.18 1.92-7.5 12.38z" fill="#FFCA28"/><path d="M16.36 17.68l-1.07-1.75-2.71-4.43-1.42 2.33 3.78 6.18 1.42-2.33z" fill="#FFA000"/><path d="M16.36 17.68L4 15.23l1.18-1.92L18.6 20l-2.24-2.32z" fill="#F57C00"/></svg>',
      url: 'https://firebase.google.com/docs',
      category: 'Backend & Veritabanı',
      sectors: ['Yazılım', 'Mobil Geliştirme'],
      status: 'aktif',
      pricing: { summary: 'Cömert ücretsiz katman ("Spark Plan") ve kullanıma dayalı ücretli katman ("Blaze Plan") sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Firebase Admin SDK\'larını (Node.js, Python, Java vb.) kullanarak sunucu tarafında tam yetkili işlemler yapabilirsiniz. İstemci tarafında ise güvenliği Kurallar (Rules) ile sağlarsınız.',
      apiKeyGuide: { description: 'Firebase konsoluna gidin, bir proje oluşturun. Proje Ayarları > Hizmet Hesapları bölümünden sunucu SDK\'ları için gerekli yapılandırma dosyasını indirin.', url: 'https://console.firebase.google.com/' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const admin = require("firebase-admin");\nconst serviceAccount = require("./path/to/serviceAccountKey.json");\n\nadmin.initializeApp({\n  credential: admin.credential.cert(serviceAccount)\n});\n\nconst db = admin.firestore();\nconst docRef = db.collection(\'users\').doc(\'alovelace\');\n\nawait docRef.set({ first: \'Ada\', last: \'Lovelace\', born: 1815 });' },
    },
    {
      name: 'Supabase API',
      description: 'Firebase\'e açık kaynaklı bir alternatif. PostgreSQL veritabanı, kimlik doğrulama, anlık API\'ler ve depolama sunar.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.69L18.31 8 12 11.31 5.69 8 12 4.69zM4.5 8.5v7l7.5 4.22v-7.43L4.5 8.5zm15 7v-7l-7.5 3.78v7.43L19.5 15.5z" fill="#3ECF8E"/></svg>',
      url: 'https://supabase.com/docs',
      category: 'Backend & Veritabanı',
      sectors: ['Yazılım', 'Web Geliştirme'],
      status: 'aktif',
      pricing: { summary: 'Ücretsiz katman ve çeşitli ücretli katmanlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Supabase, veritabanı tablolarınız için anında RESTful ve GraphQL API\'ler oluşturur. Güvenlik, PostgreSQL\'in Satır Düzeyi Güvenlik (Row Level Security) özelliği ile sağlanır.',
      apiKeyGuide: { description: 'Supabase projenize gidin, "Project Settings" > "API" bölümünden Proje URL\'nizi ve API anahtarlarınızı (anon ve service_role) bulun.', url: 'https://app.supabase.com' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'import { createClient } from \'@supabase/supabase-js\'\n\nconst supabaseUrl = \'YOUR_SUPABASE_URL\'\nconst supabaseKey = \'YOUR_SUPABASE_ANON_KEY\'\nconst supabase = createClient(supabaseUrl, supabaseKey)\n\nasync function getCountries() {\n  const { data: countries, error } = await supabase.from(\'countries\').select(\'*\')\n  console.log(countries);\n}\n\ngetCountries();' },
    },
    {
      name: 'Zapier API',
      description: 'Binlerce web uygulamasını birbirine bağlayarak iş akışlarını otomatikleştirin. Tetikleyiciler ve eylemlerle özel \'Zap\'ler oluşturun.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 12h3v9H3zM18 3h3v18h-3zM8 9h3v12H8zM13 6h3v15h-3z" fill="#FF4A00"/></svg>',
      url: 'https://zapier.com/platform/documentation',
      category: 'İş Akışı Otomasyonu',
      sectors: ['Otomasyon', 'SaaS', 'İş Araçları'],
      status: 'aktif',
      pricing: { summary: "Kullanıma dayalı ücretlendirme. Sınırlı bir ücretsiz plan sunar." },
      pricingType: 'Ücretli',
      integrationTip: "Zapier'in REST Hooks özelliğini kullanarak kendi uygulamanızdan Zapier'e veri gönderebilir ve otomasyonları tetikleyebilirsiniz.",
      apiKeyGuide: { description: "Zapier platformunda bir 'Integration' oluşturarak API anahtarınızı ve kimlik doğrulama ayarlarınızı yönetin.", url: "https://zapier.com/platform" },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl -X POST -H "Content-Type: application/json" -d \'{"key": "value"}\' https://hooks.zapier.com/hooks/catch/12345/abcde/' },
    },
    {
      name: 'Vercel API',
      description: 'Vercel projelerinizi, dağıtımlarınızı, alan adlarınızı ve daha fazlasını programatik olarak yönetin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 12l10 10 10-10L12 2z" fill="currentColor"/></svg>',
      url: 'https://vercel.com/docs/rest-api',
      category: 'Bulut Bilişim',
      sectors: ['Yazılım', 'Web Geliştirme', 'DevOps'],
      status: 'aktif',
      pricing: { summary: "Cömert bir ücretsiz hobi planı ve kullanıma dayalı pro planları sunar." },
      pricingType: 'Ücretli',
      integrationTip: "Dağıtımları otomatikleştirmek için CI/CD pipeline'larınızda Vercel CLI veya API'yi kullanın. Bir git push'u sonrası otomatik dağıtımı tetikleyebilirsiniz.",
      apiKeyGuide: { description: "Vercel hesabınıza gidin, 'Settings' > 'Tokens' bölümünden yeni bir Personal Access Token oluşturun.", url: "https://vercel.com/account/tokens" },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl "https://api.vercel.com/v9/projects" -H "Authorization: Bearer YOUR_TOKEN"' },
    },
    {
      name: 'DigitalOcean API',
      description: 'Droplet\'leri, veritabanlarını, alan adlarını ve DigitalOcean\'daki diğer altyapı kaynaklarını yönetmek için RESTful bir arayüz.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.5 6.2c-1.8-2.3-4.5-3.7-7.5-3.7-3.1 0-5.9 1.5-7.7 3.9-2 .3-3.8 2-3.8 4.3 0 2.5 2 4.5 4.5 4.5h.5c.2 2.8 2.5 5 5.3 5s5.1-2.2 5.3-5h.7c2.2 0 4-1.8 4-4 0-2.2-1.8-4-4-4-.1 0-.3 0-.4-.1z" fill="#0080FF"/></svg>',
      url: 'https://docs.digitalocean.com/reference/api/api-reference/',
      category: 'Bulut Bilişim',
      sectors: ['Yazılım', 'DevOps', 'Altyapı'],
      status: 'aktif',
      pricing: { summary: "Kullanıma dayalı ('pay-as-you-go') ücretlendirme modeli." },
      pricingType: 'Ücretli',
      integrationTip: "Altyapınızı kod olarak (Infrastructure as Code) yönetmek için Terraform veya Ansible gibi araçlarla DigitalOcean API'sini kullanın.",
      apiKeyGuide: { description: "DigitalOcean kontrol panelinize gidin, 'API' bölümünden yeni bir Personal Access Token oluşturun.", url: "https://cloud.digitalocean.com/account/api/tokens" },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl -X GET -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" "https://api.digitalocean.com/v2/droplets"' },
    },
    {
      name: 'YouTube Data API v3',
      description: 'Uygulamanıza YouTube özellikleri ekleyin. Videoları arayın, kanal bilgilerini alın, çalma listelerini yönetin ve daha fazlasını yapın.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.58 7.19c-.23-.86-1.04-1.5-1.9-1.7C17.5 5 12 5 12 5s-5.5 0-7.68.49c-.86.2-1.67.84-1.9 1.7C2 8.05 2 12 2 12s0 3.95.42 4.81c.23.86 1.04 1.5 1.9 1.7C6.5 19 12 19 12 19s5.5 0 7.68-.49c.86-.2 1.67-.84-1.9-1.7.42-.86.42-4.81.42-4.81s0-3.95-.42-4.81zM9.5 15.5V8.5l6.5 3.5-6.5 3.5z" fill="#FF0000"/></svg>',
      url: 'https://developers.google.com/youtube/v3/getting-started',
      category: 'Müzik & Medya',
      sectors: ['Medya', 'Eğlence', 'İçerik Üretimi'],
      status: 'aktif',
      pricing: { summary: "Kota sistemine dayalıdır. Cömert bir ücretsiz kota sunar, aşıldığında ücretlendirilir." },
      pricingType: 'Ücretli',
      integrationTip: "Her API isteğinin bir 'maliyeti' vardır. Kota kullanımınızı optimize etmek için yalnızca ihtiyacınız olan `part`'ları (snippet, contentDetails vb.) isteyin.",
      apiKeyGuide: { description: "Google Cloud Console'da bir proje oluşturun, 'YouTube Data API v3'ü etkinleştirin ve 'Credentials' bölümünden bir API anahtarı oluşturun.", url: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=AI_Studio&key=YOUR_API_KEY`)\n  .then(response => response.json())\n  .then(data => console.log(data.items));' },
    },
    {
      name: 'Google Analytics Data API',
      description: 'Google Analytics 4 mülkleriniz için programatik olarak raporlar oluşturun ve verilerinize erişin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.5 3h-15A2.5 2.5 0 002 5.5v13A2.5 2.5 0 004.5 21h15a2.5 2.5 0 002.5-2.5v-13A2.5 2.5 0 0019.5 3zM8 17H6v-5h2v5zm4 0h-2V8h2v9zm4 0h-2v-3h2v3z" fill="#F4A62A"/></svg>',
      url: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
      category: 'Veri & Analitik',
      sectors: ['Pazarlama', 'Veri Analizi', 'E-Ticaret'],
      status: 'aktif',
      pricing: { summary: "Standart Google API kota limitleri geçerlidir, çoğu kullanım için ücretsizdir." },
      pricingType: 'Ücretsiz',
      integrationTip: "Boyutları (dimensions) ve metrikleri (metrics) doğru bir şekilde birleştirerek özel raporlar oluşturabilirsiniz. API, verileri doğrudan uygulamanıza entegre etmek için mükemmeldir.",
      apiKeyGuide: { description: "Google Cloud Console'da bir proje oluşturun, 'Google Analytics Data API'yi etkinleştirin ve OAuth 2.0 veya hizmet hesabı anahtarı oluşturun.", url: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: '// Requires Google Auth Library\nasync function runReport() {\n  const {BetaAnalyticsDataClient} = require(\'@google-analytics/data\');\n  const analyticsDataClient = new BetaAnalyticsDataClient();\n  const [response] = await analyticsDataClient.runReport({\n    property: `properties/YOUR_PROPERTY_ID`,\n    //... report configuration\n  });\n  console.log(response);\n}' },
    },
    {
      name: 'X (Twitter) API v2',
      description: 'Tweetleri, kullanıcıları, trendleri ve daha fazlasını programatik olarak okumak ve yazmak için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/></svg>',
      url: 'https://developer.twitter.com/en/docs/twitter-api',
      category: 'Sosyal Medya',
      sectors: ['Medya', 'Pazarlama'],
      status: 'aktif',
      pricing: { summary: 'Sınırlı bir ücretsiz erişim ve çeşitli ücretli katmanlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Birçok salt okunur endpoint için bir "Bearer Token" yeterlidir. Kullanıcı adına işlem yapmak (tweet atmak gibi) için OAuth 2.0 veya 1.0a gerekir.',
      apiKeyGuide: { description: 'Twitter Geliştirici Portalı\'na gidin, bir proje ve uygulama oluşturun. Uygulama ayarlarında anahtarlarınızı ve jetonlarınızı bulacaksınız.', url: 'https://developer.twitter.com/en/portal/dashboard' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl "https://api.twitter.com/2/tweets/search/recent?query=from:twitterdev" \\\n-H "Authorization: Bearer $BEARER_TOKEN"' },
    },
    {
      name: 'Discord API',
      description: 'Sunucuları yönetmek, mesaj göndermek ve Discord botları oluşturmak için kullanılır.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.3,3.7C18.8,2.8,17.1,2.2,15.4,2c-0.1,0.3-0.3,0.6-0.4,0.9c-1.5-0.2-3-0.2-4.5,0C10.4,2.6,10.2,2.3,10.1,2 C8.4,2.2,6.7,2.8,5.2,3.7C2.2,7.3,1.3,11.5,2.2,15.5c1.6,1.4,3.6,2.5,5.8,3.2c0.2-0.3,0.4-0.6,0.6-0.9c-0.6-0.2-1.1-0.5-1.7-0.9 c-0.2-0.1-0.3-0.2-0.4-0.3c-0.1-0.1-0.1-0.2,0-0.3c1.5,0.9,3.2,1.4,5,1.4s3.5-0.5,5-1.4c0.1-0.1,0.1-0.2,0-0.3 c-0.1-0.1-0.2-0.2-0.4-0.3c-0.6,0.3-1.1,0.6-1.7,0.9c0.2,0.3,0.4,0.6,0.6,0.9c2.2-0.7,4.2-1.8,5.8-3.2C24.2,11.5,23.3,7.3,20.3,3.7z M9.8,13.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S10.7,13.8,9.8,13.8z M15.7,13.8 c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S16.5,13.8,15.7,13.8z" fill="#5865F2"/></svg>',
      url: 'https://discord.com/developers/docs/intro',
      category: 'Sosyal Medya',
      sectors: ['Oyun', 'Topluluk Yönetimi'],
      status: 'aktif',
      pricing: { summary: 'Ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Bot Token\'ı `Authorization: Bot YOUR_TOKEN` başlığı ile gönderilir. WebSocket bağlantısı üzerinden gerçek zamanlı olayları (yeni mesajlar gibi) dinleyebilirsiniz.',
      apiKeyGuide: { description: 'Discord Geliştirici Portalı\'na gidin, yeni bir uygulama oluşturun. "Bot" sekmesinden bir bot kullanıcısı ekleyin ve token\'ını alın.', url: 'https://discord.com/developers/applications' },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: 'const { Client, GatewayIntentBits } = require(\'discord.js\');\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] });\n\nclient.on(\'ready\', () => {\n  console.log(`Logged in as ${client.user.tag}!`);\n});\n\nclient.login(\'YOUR_BOT_TOKEN\');' },
    },
    {
      name: 'Google Maps Platform',
      description: 'Uygulamalarınıza haritalar, rotalar, yerler ve daha fazlasını eklemek için güçlü bir API seti.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="#4285F4"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill-opacity="0.3" fill="#EA4335"/></svg>',
      url: 'https://developers.google.com/maps',
      category: 'Haritalama',
      sectors: ['Seyahat & Turizm', 'Lojistik', 'Perakende'],
      status: 'aktif',
      pricing: { summary: 'Aylık 200$ değerinde cömert bir ücretsiz kullanım kredisi sunar, ardından kullanıma dayalı ücretlendirilir.' },
      pricingType: 'Ücretli',
      integrationTip: 'Tek bir API Anahtarı gereklidir. Güvenlik için anahtarı belirli API\'ler ve alan adları ile kısıtladığınızdan emin olun.',
      apiKeyGuide: { description: 'Google Cloud Console\'a gidin, bir proje oluşturun, "Google Maps Platform" API\'lerini etkinleştirin ve "Credentials" bölümünden bir API anahtarı oluşturun.', url: 'https://console.cloud.google.com/google/maps-apis' },
      aiStudioRecommended: true,
      codeExample: { language: 'HTML', code: '<div id="map" style="height: 400px; width: 100%;"></div>\n<script>\nfunction initMap() {\n  const map = new google.maps.Map(document.getElementById("map"), {\n    center: { lat: -34.397, lng: 150.644 },\n    zoom: 8,\n  });\n}\n</script>\n<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap" async defer></script>' },
    },
    {
      name: 'Amazon Web Services (AWS) API',
      description: 'S3, EC2, Lambda ve daha fazlası dahil olmak üzere geniş bir AWS hizmetleri yelpazesini programatik olarak yönetin.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.4,15.3c-0.3-0.5-0.5-1-0.5-1.6c0-1.8,1-3.3,2.4-4.2c-0.8-1-2-1.7-3.4-2.1v0c-1.3-0.4-2.7-0.4-4,0v0 c-1.4,0.4-2.6,1.1-3.4,2.1c1.4,0.9,2.4,2.4,2.4,4.2c0,0.6-0.2,1.1-0.5,1.6c-0.3,0.5-0.7,0.9-1.2,1.2C4.9,17,4,17.4,3,17.7 c-0.1,0-0.2,0-0.3,0.1c-0.7,0.2-1.3,0.5-1.7,1c-0.4,0.5-0.6,1-0.6,1.6c0,0.2,0,0.3,0.1,0.5c0.1,0.2,0.2,0.3,0.4,0.4 c0.2,0.1,0.3,0.2,0.5,0.2h19c0.2,0,0.3-0.1,0.5-0.2c0.2-0.1,0.3-0.2,0.4-0.4c0.1-0.2,0.1-0.3,0.1-0.5c0-0.6-0.2-1.1-0.6-1.6 c-0.4-0.5-1-0.8-1.7-1c-0.1,0-0.2-0.1-0.3-0.1c-1-0.3-1.9-0.7-2.8-1.2C15.1,16.2,14.7,15.8,14.4,15.3z" fill="#FF9900"/><path d="M9.1,12.5c0-1.5,1.2-2.7,2.7-2.7s2.7,1.2,2.7,2.7c0,1.5-1.2,2.7-2.7,2.7S9.1,14,9.1,12.5z" fill="#232F3E"/></svg>',
      url: 'https://aws.amazon.com/api/',
      category: 'Bulut Bilişim',
      sectors: ["Altyapı", "Yazılım", "DevOps"],
      status: 'aktif',
      pricing: { summary: "Kullanıma dayalı ('pay-as-you-go') ücretlendirme. Cömert bir ücretsiz kullanım katmanı sunar." },
      pricingType: 'Ücretli',
      integrationTip: "AWS SDK'larını (boto3 for Python, AWS SDK for JavaScript) kullanarak API ile etkileşimi basitleştirin. IAM rolleri ile güvenliği sağlayın.",
      apiKeyGuide: { description: "AWS IAM konsoluna gidin, bir kullanıcı oluşturun ve programatik erişim için bir Erişim Anahtarı ID'si ve Gizli Erişim Anahtarı oluşturun.", url: "https://console.aws.amazon.com/iam/" },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: "const { S3Client } = require(\"@aws-sdk/client-s3\");\nconst client = new S3Client({ region: \"us-east-1\" });\n// Use client to send commands..." },
    },
    {
      name: 'Google Cloud Platform API',
      description: 'Cloud Storage, Compute Engine ve Cloud Functions gibi Google Cloud hizmetlerini yönetmek için bir dizi API.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.3,7.6c-0.6-1-1.5-1.8-2.6-2.4C15.6,4.6,14.3,4,12.9,4c-2.3,0-4.4,0.9-6,2.4c-1.6,1.5-2.5,3.6-2.5,6 c0,2.3,0.9,4.4,2.5,5.9c1.6,1.5,3.6,2.4,6,2.4c1.4,0,2.7-0.3,3.9-0.8c1.2-0.5,2.3-1.3,3.2-2.3c0.9-1,1.5-2.3,1.7-3.6 c0.2-1.3,0-2.6-0.5-3.8C20.4,9.2,19.9,8.4,19.3,7.6z M12.9,18.7c-3.7,0-6.6-3-6.6-6.6s3-6.6,6.6-6.6c1.8,0,3.5,0.7,4.7,2 c1.2,1.2,2,2.9,2,4.7C19.5,15.7,16.6,18.7,12.9,18.7z" fill="#4285F4"/><path d="M12.9,7.5c-2.9,0-5.2,2.3-5.2,5.2s2.3,5.2,5.2,5.2c2.9,0,5.2-2.3,5.2-5.2S15.8,7.5,12.9,7.5z" fill="#34A853"/></svg>',
      url: 'https://cloud.google.com/apis',
      category: 'Bulut Bilişim',
      sectors: ["Altyapı", "Yazılım", "Veri Analizi"],
      status: 'aktif',
      pricing: { summary: "Kullanıma dayalı ücretlendirme. Cömert bir ücretsiz kullanım katmanı ve krediler sunar." },
      pricingType: 'Ücretli',
      integrationTip: "gcloud CLI, başlangıç için harikadır. Programatik erişim için, hizmet hesapları (service accounts) oluşturun ve istemci kütüphanelerini kullanın.",
      apiKeyGuide: { description: "Google Cloud Console'a gidin, bir proje seçin, 'APIs & Services > Credentials' bölümünden bir hizmet hesabı anahtarı veya API anahtarı oluşturun.", url: "https://console.cloud.google.com/" },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: "const { Storage } = require('@google-cloud/storage');\nconst storage = new Storage();\nasync function listBuckets() {\n  const [buckets] = await storage.getBuckets();\n  console.log(buckets);\n}\nlistBuckets();" },
    },
    {
      name: 'Microsoft Azure API',
      description: 'Sanal Makineler, Depolama ve App Service gibi Azure kaynaklarını yönetmek için REST API\'leri.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.7,3.3L6,14.9l-3.3,0.3l9.9-12C12.6,3.2,12.7,3.3,12.7,3.3z M7.4,15.2l3.8-6.1L14,21.3L7.4,15.2z M15.3,19.8L18.8,9 l3.2-0.2L12.1,21.5C13.2,21.5,14.3,20.8,15.3,19.8z" fill="#008AD7"/></svg>',
      url: 'https://docs.microsoft.com/en-us/rest/api/azure/',
      category: 'Bulut Bilişim',
      sectors: ["Altyapı", "Kurumsal Yazılım", "DevOps"],
      status: 'aktif',
      pricing: { summary: "Kullanıma dayalı ücretlendirme. Ücretsiz deneme ve krediler sunar." },
      pricingType: 'Ücretli',
      integrationTip: "Kimlik doğrulama için Azure Active Directory (AAD) kullanılır. Bir 'App Registration' oluşturarak başlayın. Azure CLI, yönetim görevlerini otomatikleştirmek için güçlüdür.",
      apiKeyGuide: { description: "Azure Portal'a gidin, 'Azure Active Directory > App registrations' bölümünden yeni bir uygulama kaydedin ve bir client secret oluşturun.", url: "https://portal.azure.com/" },
      aiStudioRecommended: true,
      codeExample: { language: 'JavaScript', code: "const { DefaultAzureCredential } = require(\"@azure/identity\");\nconst { ResourceManagementClient } = require(\"@azure/arm-resources\");\n\nconst credential = new DefaultAzureCredential();\nconst client = new ResourceManagementClient(credential, \"YOUR_SUBSCRIPTION_ID\");" },
    },
    {
      name: 'MongoDB Atlas API',
      description: "Buluttaki MongoDB dağıtımlarınızı (cluster'lar, veritabanı kullanıcıları, ağ erişimi vb.) otomatikleştirmek ve yönetmek için kullanılır.",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.9,14.4c-0.3-0.3-0.7-0.4-1.1-0.4c-0.5,0-1,0.2-1.3,0.6c-0.2,0.2-0.3,0.5-0.4,0.7c-0.1,0.2-0.2,0.5-0.2,0.8 c0,0.7,0.2,1.3,0.7,1.8c0.5,0.5,1.1,0.7,1.8,0.7c0.4,0,0.8-0.1,1.1-0.3c0.4-0.2,0.7-0.5,0.9-0.9c0.2-0.4,0.3-0.8,0.3-1.2 C17.3,15.4,17.1,14.8,16.9,14.4z M12,2.1C6.5,2.1,2.1,6.5,2.1,12c0,5.5,4.5,9.9,9.9,9.9c5.5,0,9.9-4.5,9.9-9.9 C21.9,6.5,17.5,2.1,12,2.1z M12,19.4c-1.2,0-2.4-0.3-3.4-0.8c0.2-1.1,0.9-2,2-2.4c0.6-0.2,1.2-0.3,1.8-0.3s1.2,0.1,1.8,0.3 c1.1,0.4,1.8,1.3,2,2.4C14.4,19.1,13.2,19.4,12,19.4z M15.2,12.1c-0.3-0.6-0.8-1.2-1.4-1.6c0.6-0.6,1-1.5,1-2.4c0-1-0.4-1.9-1.1-2.5 c-0.7-0.7-1.6-1.1-2.5-1.1c-1,0-1.9,0.4-2.5,1.1c-0.7,0.7-1.6-1.1-1.1,2.5c0,1,0.4,1.9,1.1,2.5c-0.6,0.4-1.1,1-1.4,1.6 C7,12,6.9,11.8,6.9,11.7c-0.1-0.2-0.2-0.5-0.2-0.8c0-0.7,0.2-1.3,0.7-1.8c0.5-0.5,1.1-0.7,1.8-0.7c0.7,0,1.3,0.2,1.8,0.7 c0.5,0.5,0.7,1.1,0.7,1.8c0,0.3-0.1,0.5-0.2,0.8C13.8,11.8,13.7,12,13.6,12.1H15.2z" fill="#4DB33D"/></svg>',
      url: 'https://www.mongodb.com/docs/atlas/api/',
      category: 'Veritabanı',
      sectors: ["Yazılım", "Veritabanı", "Backend & Veritabanı"],
      status: 'aktif',
      pricing: { summary: "Atlas cluster'ınızın boyutuna ve kullanımına bağlıdır. Ücretsiz bir cluster katmanı ('M0') sunar." },
      pricingType: 'Ücretli',
      integrationTip: "Programatik kimlik doğrulama için bir API Anahtarı oluşturun ve bu anahtarı IP erişim listesine eklediğinizden emin olun. Bu API, veritabanına veri eklemek için değil, altyapıyı yönetmek içindir.",
      apiKeyGuide: { description: "MongoDB Atlas'ta, 'Organization' veya 'Project' ayarlarınıza gidin, 'Access Manager' > 'API Keys' bölümünden yeni bir anahtar oluşturun.", url: "https://cloud.mongodb.com/" },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl --user "{PUBLIC_KEY}:{PRIVATE_KEY}" --digest \\\n--header "Accept: application/vnd.atlas.2023-01-01+json" \\\n"https://cloud.mongodb.com/api/atlas/v2/groups/{PROJECT_ID}/clusters"' },
    },
    {
      name: 'Postmark API',
      description: 'Geliştiriciler için tasarlanmış, yüksek teslimat oranına sahip, hızlı ve güvenilir bir işlem e-postası gönderme hizmeti.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 6.5C22 5.1 20.9 4 19.5 4H4.5C3.1 4 2 5.1 2 6.5V17.5C2 18.9 3.1 20 4.5 20H19.5C20.9 20 22 18.9 22 17.5V6.5ZM20 8.8L12.5 14.1C12.2 14.3 11.8 14.3 11.5 14.1L4 8.8V6.5C4 6.2 4.2 6 4.5 6H19.5C19.8 6 20 6.2 20 6.5V8.8Z" fill="currentColor"/></svg>',
      url: 'https://postmarkapp.com/developer',
      category: 'İletişim',
      sectors: ["Yazılım", "SaaS", "E-Ticaret"],
      status: 'aktif',
      pricing: { summary: "Aylık e-posta hacmine dayalı ücretlendirme. Küçük bir ücretsiz deneme sunar." },
      pricingType: 'Ücretli',
      integrationTip: "Postmark, işlem ve pazarlama e-postalarını ayrı 'stream'lerde tutar. Doğru stream için doğru Server API Token'ı kullandığınızdan emin olun.",
      apiKeyGuide: { description: "Postmark hesabınıza giriş yapın, bir 'Server' oluşturun ve 'API Tokens' sekmesinden Server API Token'ınızı kopyalayın.", url: "https://account.postmarkapp.com/servers" },
      aiStudioRecommended: false,
      codeExample: { language: 'JavaScript', code: 'var postmark = require("postmark");\nvar client = new postmark.ServerClient("YOUR_SERVER_TOKEN");\n\nclient.sendEmail({\n  "From": "sender@example.com",\n  "To": "receiver@example.com",\n  "Subject": "Hello from Postmark",\n  "TextBody": "This is a test email."\n});' },
    },
    {
      name: 'Pusher Channels API',
      description: 'Uygulamalarınıza kolayca ölçeklenebilir, gerçek zamanlı bildirimler, sohbet ve WebSocket işlevselliği eklemek için barındırılan bir hizmet.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.6 4.4c-1.3-1.3-3-2-4.8-2s-3.5.7-4.8 2c-.6.6-.9 1.3-1 2.1-.1.8 0 1.6.3 2.3.3.7.8 1.4 1.4 1.9 1.2 1.2 2.8 1.8 4.5 1.8s3.3-.6 4.5-1.8c.6-.5 1.1-1.2 1.4-1.9.3-.7.4-1.5-.3-2.3-.1-.8-.4-1.5-1-2.1zm-4.8 6c-1.7 0-3.1-1.4-3.1-3.1s1.4-3.1 3.1-3.1 3.1 1.4 3.1 3.1-1.4 3.1-3.1 3.1zM4.4 19.6c1.3 1.3 3 2 4.8 2s3.5-.7 4.8-2c.6-.6.9-1.3 1-2.1.1-.8 0-1.6-.3-2.3-.3-.7-.8-1.4-1.4-1.9-1.2-1.2-2.8-1.8-4.5-1.8s-3.3.6-4.5 1.8c-.6.5-1.1 1.2-1.4 1.9-.3.7-.4-1.5-.3-2.3.1-.8.4-1.5 1-2.1z" fill="#300D4F"/></svg>',
      url: 'https://pusher.com/channels/docs/',
      category: 'İletişim',
      sectors: ["Yazılım", "Oyun", "Sosyal Medya"],
      status: 'aktif',
      pricing: { summary: "Eşzamanlı bağlantı ve mesaj sayısına dayalı ücretsiz ve ücretli katmanlar." },
      pricingType: 'Ücretli',
      integrationTip: "Backend'iniz, Pusher sunucu kütüphanesini kullanarak olayları tetikler. Frontend'iniz ise, Pusher istemci kütüphanesini kullanarak kanallara abone olur ve olayları dinler.",
      apiKeyGuide: { description: "Pusher dashboard'una gidin, bir 'Channels app' oluşturun. Uygulamanızın 'App Keys' bölümünden anahtarlarınızı bulacaksınız.", url: "https://dashboard.pusher.com/" },
      aiStudioRecommended: false,
      codeExample: { language: 'JavaScript', code: "// Server-side (Node.js)\nconst Pusher = require(\"pusher\");\nconst pusher = new Pusher({ /* your keys */ });\n\npusher.trigger(\"my-channel\", \"my-event\", { message: \"hello world\" });\n\n// Client-side\nconst pusher = new Pusher(\"APP_KEY\", { cluster: \"APP_CLUSTER\" });\nconst channel = pusher.subscribe(\"my-channel\");\nchannel.bind(\"my-event\", (data) => console.log(data));" },
    },
    {
      name: 'ClickUp API',
      description: 'Görevleri, belgeleri, hedefleri ve daha fazlasını yönetmek için son derece özelleştirilebilir bir verimlilik platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2.5 13.5l-3-3 1.4-1.4 1.6 1.6 3.6-3.6 1.4 1.4-5 5z" fill="#7B68EE"/></svg>',
      url: 'https://clickup.com/api',
      category: 'İş Araçları',
      sectors: ['Proje Yönetimi', 'Verimlilik', 'Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Cömert bir ücretsiz plan ve çeşitli ücretli katmanlar sunar.' },
      pricingType: 'Ücretli',
      integrationTip: 'ClickUp API, OAuth 2.0 veya kişisel erişim jetonları kullanır. Hızlı başlangıç için kişisel jeton daha kolaydır.',
      apiKeyGuide: { description: 'ClickUp ayarlarınızda "Apps" bölümüne gidin ve bir "Personal API Token" oluşturun.', url: 'https://app.clickup.com/2135064/settings/apps' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl "https://api.clickup.com/api/v2/team" -H "Authorization: YOUR_PERSONAL_TOKEN"' }
    },
    {
      name: 'Monday.com API',
      description: 'Ekiplerin süreçlerini, projelerini ve operasyonlarını planlamak için iş akışı uygulamaları oluşturduğu bir "İşletim Sistemi".',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-4 14H6v-8h2v8zm4 0h-2V6h2v12zm4 0h-2v-5h2v5z" fill="#5034FF"/></svg>',
      url: 'https://developer.monday.com/api-reference/docs',
      category: 'İş Araçları',
      sectors: ['Proje Yönetimi', 'İş Akışı Otomasyonu'],
      status: 'aktif',
      pricing: { summary: 'Kullanıcı sayısına ve özelliklere göre değişen ücretli planlar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Monday.com API\'si GraphQL tabanlıdır, bu da onu çok güçlü ve esnek kılar. Başlamak için "API Playground"u kullanın.',
      apiKeyGuide: { description: 'Monday.com hesabınızda, "Admin" > "API" bölümüne gidin ve "Personal API Token"ınızı oluşturun.', url: 'https://auth.monday.com/auth/login_monday' },
      aiStudioRecommended: true,
      codeExample: { language: 'GraphQL', code: 'query { boards (limit:5) { id name } }' }
    },
    {
      name: 'Telegram Bot API',
      description: 'Kullanıcılarla etkileşim kurabilen, grupları yönetebilen ve diğer hizmetlerle entegre olabilen güçlü botlar oluşturma platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5.2 6.7l-7.5 7.4c-.2.2-.5.3-.8.1l-2.6-1.5c-.3-.2-.4-.5-.2-.8l.8-2.5 5.5-5.2c.2-.2.5 0 .3.3l-4.3 4.1-.3 1.1.9.5 5.3-5.2c.2-.2.5 0 .3.2z" fill="#2AABEE"/></svg>',
      url: 'https://core.telegram.org/bots/api',
      category: 'İletişim',
      sectors: ['Sosyal Medya', 'Topluluk Yönetimi'],
      status: 'aktif',
      pricing: { summary: 'Tamamen ücretsizdir.' },
      pricingType: 'Ücretsiz',
      integrationTip: 'Botunuz için komutları (`/start`, `/help` gibi) `BotFather` ile ayarlayabilirsiniz. Güncellemeleri almak için `getUpdates` metodunu veya daha verimli olan webhookları kullanın.',
      apiKeyGuide: { description: 'Telegram\'da `@BotFather` ile bir sohbet başlatın, `/newbot` komutunu kullanın ve talimatları izleyerek botunuz için bir API jetonu alın.', url: 'https://t.me/BotFather' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl https://api.telegram.org/botYOUR_BOT_TOKEN/getMe' }
    },
    {
      name: 'Zoom API',
      description: 'Toplantıları, kullanıcıları, web seminerlerini ve hesap ayarlarını programatik olarak yönetmenizi sağlar.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2.5 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="#2D8CFF"/></svg>',
      url: 'https://developers.zoom.us/docs/api/',
      category: 'İletişim',
      sectors: ['Video Konferans', 'Kurumsal Yazılım'],
      status: 'aktif',
      pricing: { summary: 'Zoom aboneliği gerektirir. API kullanımı genellikle limitler dahilinde ücretsizdir.' },
      pricingType: 'Ücretli',
      integrationTip: 'Zoom, kimlik doğrulama için OAuth 2.0 veya JWT kullanır. Sunucudan sunucuya entegrasyonlar için JWT daha basit bir başlangıç sunar.',
      apiKeyGuide: { description: 'Zoom App Marketplace\'e gidin, bir "JWT" uygulaması oluşturun ve API Anahtarınızı ve Gizli Anahtarınızı alın.', url: 'https://marketplace.zoom.us/' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: '# Requires a generated JWT token\ncurl "https://api.zoom.us/v2/users" -H "Authorization: Bearer YOUR_JWT_TOKEN"' }
    },
    {
      name: 'Make (Integromat) API',
      description: 'Görsel bir oluşturucu kullanarak uygulamaları bağlamanıza ve iş akışlarını otomatikleştirmenize olanak tanıyan güçlü bir çevrimiçi otomasyon platformu.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6A49E8"/><circle cx="12" cy="12" r="6" fill="white"/><circle cx="12" cy="12" r="2" fill="#6A49E8"/></svg>',
      url: 'https://www.make.com/en/api-documentation',
      category: 'İş Akışı Otomasyonu',
      sectors: ['Otomasyon', 'SaaS'],
      status: 'aktif',
      pricing: { summary: 'Görev sayısına dayalı ücretsiz ve ücretli katmanlar.' },
      pricingType: 'Ücretli',
      integrationTip: 'Make, API\'nizi çağırmak için özel webhook\'lar oluşturmanıza olanak tanır. Bu, uygulamanızdaki olaylara dayalı senaryoları tetiklemek için harikadır.',
      apiKeyGuide: { description: 'Make hesabınızda, profiliniz altındaki "API" bölümünden API jetonları oluşturabilir ve yönetebilirsiniz.', url: 'https://www.make.com/en/documentation/general/api-tokens' },
      aiStudioRecommended: true,
      codeExample: { language: 'bash', code: 'curl "https://eu1.make.com/api/v2/scenarios" -H "Authorization: Token YOUR_API_TOKEN"' }
    },
  ]);
  
  searchQuery = signal('');
  activeFilters = signal<ActiveFilters>({ category: 'Tümü', sector: 'Tümü', pricing: 'Tümü', aiStudio: 'Tümü' });
  currentPage = signal(1);
  pageSize = 12;

  // Computed properties for filtering and pagination
  categories = computed(() => ['Tümü', ...new Set(this.apis().map(api => api.category))]);
  sectors = computed(() => ['Tümü', ...new Set(this.apis().flatMap(api => api.sectors))]);
  
  displayCategories = computed(() => this.categories().filter(c => c !== 'Tümü'));
  displaySectors = computed(() => this.sectors().filter(s => s !== 'Tümü'));

  filteredApis = computed(() => {
    const apis = this.apis();
    const filters = this.activeFilters();
    const search = this.searchQuery().toLowerCase();

    return apis.filter(api => {
      const categoryMatch = filters.category === 'Tümü' || api.category === filters.category;
      const sectorMatch = filters.sector === 'Tümü' || api.sectors.includes(filters.sector);
      const pricingMatch = filters.pricing === 'Tümü' || api.pricingType === filters.pricing;
      const aiStudioMatch = filters.aiStudio === 'Tümü' || (filters.aiStudio === 'Önerilen' && api.aiStudioRecommended);

      const searchMatch = search === '' || 
        api.name.toLowerCase().includes(search) ||
        api.description.toLowerCase().includes(search) ||
        api.category.toLowerCase().includes(search) ||
        api.sectors.some(s => s.toLowerCase().includes(search));
        
      return categoryMatch && sectorMatch && pricingMatch && aiStudioMatch && searchMatch;
    });
  });

  paginatedApis = computed(() => {
    return this.filteredApis().slice(0, this.currentPage() * this.pageSize);
  });

  canLoadMore = computed(() => {
    return this.paginatedApis().length < this.filteredApis().length;
  });

  constructor() {
    effect(() => {
      if (typeof window !== 'undefined') {
        if (this.theme() === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });

    effect(() => {
      // Clear user-specific data on logout
      if (!this.authService.isUserLoggedIn()) {
        this.apiBridges.set([]);
      }
    });
  }

  // Filter Methods
  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  filterByCategory(category: string): void {
    this.activeFilters.update(f => ({ ...f, category }));
    this.currentPage.set(1);
  }

  filterBySector(sector: string): void {
    this.activeFilters.update(f => ({ ...f, sector }));
    this.currentPage.set(1);
  }
  
  filterByPricing(pricing: string): void {
    this.activeFilters.update(f => ({ ...f, pricing }));
    this.currentPage.set(1);
  }
  
  filterByAiStudio(aiStudio: string): void {
    this.activeFilters.update(f => ({ ...f, aiStudio }));
    this.currentPage.set(1);
  }
  
  loadMoreApis(): void {
    this.currentPage.update(p => p + 1);
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Yapay Zeka': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Ödeme Sistemleri': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'İletişim': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'Geliştirici Araçları': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'Müzik & Medya': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Finans': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'Görsel Medya': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'Seyahat & Turizm': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      'İş Araçları': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      'E-Ticaret': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
      'Pazarlama & CRM': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Backend & Veritabanı': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
      'Sosyal Medya': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
      'Haritalama': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      'Bulut Bilişim': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      'Veri & Analitik': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
      'İş Akışı Otomasyonu': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Veritabanı': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Video Konferans': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }

  // Modal Methods
  openSettingsModal(api: ApiInfo): void {
    this.selectedApiForSettings.set(api);
  }

  closeSettingsModal(): void {
    this.selectedApiForSettings.set(null);
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }
  
  openApiBridgeBuilder(): void {
    if (!this.authService.isUserLoggedIn()) {
      // Or show a toast message
      this.isUserLoginModalOpen.set(true);
      return;
    }
    this.isApiBridgeBuilderOpen.set(true);
  }

  handleBridgeCreated(bridge: ApiBridge): void {
    this.apiBridges.update(bridges => [...bridges, bridge]);
    this.isApiBridgeBuilderOpen.set(false);
  }
  
  handleLogout(): void {
    this.authService.logout();
    // User-specific data is cleared by the effect in constructor
  }

  handleGithubLogin(): void {
    this.authService.githubLogin();
    this.isGithubLoginOpen.set(false);
    // Gerçek bir uygulamada, burada bir callback veya yönlendirme olurdu
    this.exportMessage.set('GitHub yetkilendirmesi başarılı! Şimdi yüklemeyi deneyebilirsiniz.');
    this.exportState.set('success');
    setTimeout(() => {
        this.exportState.set('idle');
        this.exportMessage.set('');
    }, 4000);
  }
  
  resetGenerator(): void {
    this.integrationQuery.set('');
    this.generatorState.set('idle');
    this.generatedIntegration.set(null);
    this.capabilityTestResults.set({});
    this.generatedCodeByFramework.set({});
    this.accessToken.set(null);
    this.authParamsForm.set({});
  }

  // Core functionality
  async createIntegration(apiQuery?: string): Promise<void> {
    const query = apiQuery ?? this.integrationQuery();
    if (!query || this.generatorState() === 'loading') return;
    
    if(!apiQuery) { // Don't clear query if coming from library
      this.integrationQuery.set(query);
    }
    
    this.generatorState.set('loading');
    this.loadingMessage.set('Entegrasyon planı analiz ediliyor...');
    this.generatedIntegration.set(null);
    this.capabilityTestResults.set({});
    this.generatedCodeByFramework.set({});
    this.accessToken.set(null);
    this.authParamsForm.set({});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const integration = await this.geminiService.generateIntegrationPlan(query);
      this.generatedIntegration.set(integration);
      
      // Pre-fill auth form from credentials
      const savedCreds = this.apiCredentialService.getCredential(integration.name);
      if (savedCreds) {
        const newAuthFormState: Record<string, { value: any, valid: boolean }> = {};
        integration.auth.params.forEach(param => {
          const savedPair = savedCreds.find(p => p.key === param.name);
          if (savedPair) {
            newAuthFormState[param.name] = { value: savedPair.value, valid: true };
          }
        });
        this.authParamsForm.set(newAuthFormState);
      }
      
      this.generatorState.set('success');
      this.generationHistory.update(history => [integration, ...history.filter(h => h.name !== integration.name).slice(0, 4)]);
      this.loadingMessage.set('Standalone Angular servisi üretiliyor...');
      
      if(integration.capabilities.length > 0) {
        this.activeTestTab.set(integration.capabilities[0].name);
      }

      const angularCode = await this.geminiService.generateStandaloneService(integration);
      this.generatedCodeByFramework.update(c => ({ ...c, Angular: angularCode }));
      this.loadingMessage.set('');
    } catch (error: any) {
      console.error('Entegrasyon oluşturma hatası:', error);
      this.generatorState.set('error');
      this.loadingMessage.set(this.getErrorMessage(error));
    }
  }
  
  getErrorMessage(error: any): string {
      if (typeof error === 'object' && error !== null) {
          if (error.message && error.message.includes('429')) {
              return 'API kullanım limiti aşıldı. Lütfen bir dakika bekleyip tekrar deneyin.';
          }
          if(error.message) return error.message;
      }
      return 'Bilinmeyen bir hata oluştu.';
  }

  onAuthParamChange(name: string, value: any, required: boolean): void {
    this.authParamsForm.update(current => ({
      ...current,
      [name]: {
        value,
        valid: required ? !!value : true
      }
    }));
  }

  async testCapability(capability: Capability): Promise<void> {
    const authParams = this.authParamsForm();
    const allParams: Record<string, any> = {};

    // Add auth params
    for (const key in authParams) {
      allParams[key] = authParams[key].value;
    }
    
    // Save/Update credentials on test run
    const credPairs = Object.keys(authParams).map(key => ({ key, value: authParams[key].value }));
    if(credPairs.length > 0) {
      const apiName = this.generatedIntegration()!.name;
      if (this.apiCredentialService.getCredential(apiName)) {
        this.apiCredentialService.updateCredential(apiName, credPairs);
      } else {
        this.apiCredentialService.saveCredential(apiName, credPairs);
      }
    }


    // Add capability-specific params from the form
    const formSelector = `form[name="form-${capability.name}"]`;
    const form = document.querySelector(formSelector) as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      formData.forEach((value, key) => {
        allParams[key] = value;
      });
    }

    this.capabilityTestResults.update(results => ({
      ...results,
      [capability.name]: { status: 'loading', response: null }
    }));

    try {
      const integration = this.generatedIntegration();
      if (!integration) throw new Error('Entegrasyon bulunamadı.');
      
      const result = await this.geminiService.liveApiCall(integration, capability, allParams);
      
      if(result.accessToken) {
        this.accessToken.set(result.accessToken);
      }

      this.capabilityTestResults.update(results => ({
        ...results,
        [capability.name]: { status: 'success', response: result.response, requestUrl: result.requestUrl, statusCode: 200, responseTime: result.responseTime }
      }));
    } catch (error: any) {
      console.error(`'${capability.name}' testi başarısız oldu:`, error);
      const requestUrl = this.geminiService.lastConstructedUrl;
      const response = error.error || { message: error.message };
      
      this.capabilityTestResults.update(results => ({
        ...results,
        [capability.name]: { 
          status: 'error', 
          response,
          requestUrl,
          statusCode: error.status,
          responseTime: error.responseTime
        }
      }));
    }
  }

  async fixCapability(capability: Capability): Promise<void> {
    const result = this.capabilityTestResults()[capability.name];
    if (!result || !result.response) return;

    this.capabilityTestResults.update(results => ({ ...results, [capability.name]: { ...result, loadingFix: true } }));

    try {
      const suggestion = await this.geminiService.fixFailedCapability(this.generatedIntegration()!, capability, result.response);
      this.capabilityTestResults.update(results => ({ ...results, [capability.name]: { ...result, loadingFix: false, fixSuggestion: suggestion } }));
    } catch (error) {
      console.error('Çözüm önerisi alınırken hata:', error);
      this.capabilityTestResults.update(results => ({ ...results, [capability.name]: { ...result, loadingFix: false, fixSuggestion: 'Çözüm önerisi alınırken bir hata oluştu.' } }));
    }
  }
  
  viewHistoryItem(item: GeneratedIntegration): void {
    this.generatedIntegration.set(item);
    this.integrationQuery.set('');
    this.generatorState.set('success');
    this.capabilityTestResults.set({});
    this.generatedCodeByFramework.set({});
    this.accessToken.set(null);
    this.authParamsForm.set({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Pre-fill auth form from credentials
    const savedCreds = this.apiCredentialService.getCredential(item.name);
    if (savedCreds) {
      const newAuthFormState: Record<string, { value: any, valid: boolean }> = {};
      item.auth.params.forEach(param => {
        const savedPair = savedCreds.find(p => p.key === param.name);
        if (savedPair) {
          newAuthFormState[param.name] = { value: savedPair.value, valid: true };
        }
      });
      this.authParamsForm.set(newAuthFormState);
    }
    
    if(item.capabilities.length > 0) {
        this.activeTestTab.set(item.capabilities[0].name);
    }

    this.regenerateForFramework('Angular');
  }

  async regenerateForFramework(framework: Framework): Promise<void> {
    this.selectedFramework.set(framework);
    const integration = this.generatedIntegration();
    if (!integration) return;

    if (this.generatedCodeByFramework()[framework]) {
      return; // Already generated
    }
    
    this.loadingMessage.set(`${framework} için kod üretiliyor...`);
    try {
      let code = '';
      const angularCode = this.generatedCodeByFramework()['Angular'];

      if (framework === 'Angular' && !angularCode) {
        code = await this.geminiService.generateStandaloneService(integration);
      } else if (framework === 'React' || framework === 'Vue') {
         if (!angularCode) {
            const tempAngularCode = await this.geminiService.generateStandaloneService(integration);
            this.generatedCodeByFramework.update(c => ({...c, Angular: tempAngularCode }));
            code = await this.geminiService.regenerateCodeForFramework(tempAngularCode, framework, integration);
         } else {
            code = await this.geminiService.regenerateCodeForFramework(angularCode, framework, integration);
         }
      } else if (framework === 'WordPress') {
          code = await this.geminiService.regenerateForWordPress(integration);
      } else if (framework === 'Node.js' || framework === 'Python') {
          code = await this.geminiService.regenerateForBackendFramework(framework, integration);
      }

      this.generatedCodeByFramework.update(c => ({ ...c, [framework]: code }));
    } catch (error) {
      console.error(`${framework} için kod üretimi başarısız:`, error);
    } finally {
      this.loadingMessage.set('');
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => this.copiedCode.set(''), 2000);
    });
  }

  async exportIntegration(type: 'download' | 'drive' | 'github' | 'postman'): Promise<void> {
    if (type === 'postman') {
      const integration = this.generatedIntegration();
      if (!integration) return;
      
      this.exportState.set('loading');
      this.exportMessage.set('Postman koleksiyonu oluşturuluyor...');
      
      try {
          const collectionJson = await this.geminiService.generatePostmanCollection(integration);
          const blob = new Blob([JSON.stringify(collectionJson, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const fileName = `${integration.name.replace(/\s+/g, '_')}.postman_collection.json`;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);
          this.exportState.set('success');
          this.exportMessage.set('Postman koleksiyonu başarıyla indirildi.');

      } catch(e) {
          this.exportState.set('error');
          this.exportMessage.set('Postman koleksiyonu oluşturulamadı.');
      } finally {
          setTimeout(() => this.exportState.set('idle'), 3000);
      }
      return;
    }

    if (!this.authService.isAdmin() && (type === 'drive' || type === 'github')) {
      this.exportState.set('error');
      this.exportMessage.set('Bu özellik için yönetici olarak giriş yapmalısınız.');
      setTimeout(() => this.exportState.set('idle'), 3000);
      return;
    }
    
     if (type === 'github' && !this.authService.isGithubLoggedIn()) {
      this.isGithubLoginOpen.set(true);
      return;
    }

    this.exportState.set('loading');
    this.exportMessage.set('Entegrasyon dosyası hazırlanıyor...');

    setTimeout(() => {
      const framework = this.selectedFramework();
      const code = this.generatedCodeByFramework()[framework];
      if (!code) {
        this.exportState.set('error');
        this.exportMessage.set('Dışa aktarılacak kod bulunamadı.');
        return;
      }

      const integrationName = this.generatedIntegration()?.name.replace(/\s+/g, '-') || 'entegrasyon';
      const fileExtensions: Record<Framework, string> = {
          'Angular': '.service.ts',
          'React': '.hook.jsx',
          'Vue': '.composable.js',
          'WordPress': '.plugin.php',
          'Node.js': '.router.js',
          'Python': '.app.py'
      };
      const fileName = `${integrationName.toLowerCase()}${fileExtensions[framework]}`;

      if (type === 'download') {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
        this.exportState.set('success');
        this.exportMessage.set(`${fileName} başarıyla indirildi.`);
      } else if (type === 'drive') {
        this.exportState.set('success');
        this.exportMessage.set(`Dosya Google Drive'a başarıyla kaydedildi (simülasyon).`);
      } else if (type === 'github') {
        this.exportState.set('success');
        this.exportMessage.set(`Kod GitHub deposuna başarıyla yüklendi (simülasyon).`);
      }
      setTimeout(() => this.exportState.set('idle'), 3000);
    }, 1500);
  }
  
  getSavedCredentialValue(apiName: string, paramName: string): string {
    const creds = this.apiCredentialService.getCredential(apiName);
    const pairs = creds ?? [];
    return pairs.find(p => p.key === paramName)?.value || '';
  }

  getLanguageForFramework(framework: Framework): string {
      const map: Record<Framework, string> = {
          'Angular': 'typescript',
          'React': 'jsx',
          'Vue': 'javascript',
          'WordPress': 'php',
          'Node.js': 'javascript',
          'Python': 'python'
      };
      return map[framework];
  }
}