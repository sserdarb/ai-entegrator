import { GeneratedIntegration } from './api.model';

// This acts as a local, high-quality cache for popular APIs to ensure speed and accuracy.
// The key should be the lowercase, trimmed name of the API.
export const KNOWLEDGE_BASE = new Map<string, GeneratedIntegration>([
  [
    'github rest api',
    {
      name: 'GitHub REST API',
      description: 'GitHub depoları, kullanıcılar, issue\'lar ve daha fazlası hakkında verilere programatik olarak erişmenizi sağlayan RESTful API.',
      auth: {
        type: 'bearer_token',
        description: 'Kimlik doğrulaması için bir Kişisel Erişim Jetonu (Personal Access Token) gereklidir. Bu jeton, isteklerin Authorization başlığında "Bearer YOUR_TOKEN" olarak gönderilir.',
        params: [
          {
            name: 'token',
            label: 'Personal Access Token',
            type: 'password',
            required: true,
            example: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxx',
          },
        ],
      },
      capabilities: [
        {
          name: 'Get Authenticated User',
          description: 'Mevcut kimliği doğrulanmış kullanıcı hakkındaki bilgileri alır.',
          endpoint: 'https://api.github.com/user',
          method: 'GET',
          params: [],
        },
        {
          name: 'List User Repositories',
          description: 'Belirtilen kullanıcının herkese açık depolarını listeler.',
          endpoint: 'https://api.github.com/users/{username}/repos',
          method: 'GET',
          params: [
            {
              name: 'username',
              label: 'GitHub Username',
              type: 'text',
              required: true,
              example: 'octocat',
            },
          ],
        },
        {
          name: 'List Repository Issues',
          description: 'Belirtilen depodaki issue\'ları (sorunları) listeler.',
          endpoint: 'https://api.github.com/repos/{owner}/{repo}/issues',
          method: 'GET',
          params: [
            {
              name: 'owner',
              label: 'Repository Owner',
              type: 'text',
              required: true,
              example: 'microsoft',
            },
            {
              name: 'repo',
              label: 'Repository Name',
              type: 'text',
              required: true,
              example: 'vscode',
            },
          ],
        },
      ],
      githubAnalysis: {
        popularSDKs: [
          {
            name: '@octokit/rest.js',
            url: 'https://github.com/octokit/rest.js',
            description: 'GitHub REST API için resmi JavaScript SDK\'sı. Kimlik doğrulama, sayfalama ve daha fazlası için yerleşik destek sağlar.',
          },
          {
            name: 'PyGithub',
            url: 'https://github.com/PyGithub/PyGithub',
            description: 'Python için en popüler ve kapsamlı GitHub API sarmalayıcısı.',
          },
        ],
        usageExample: 'const { Octokit } = require("@octokit/rest");\nconst octokit = new Octokit({ auth: `YOUR_PERSONAL_ACCESS_TOKEN` });',
      },
    },
  ],
  [
    'stripe api',
    {
      name: 'Stripe API',
      description: 'Web siteleri ve mobil uygulamalar için güçlü bir ödeme işleme platformu. Abonelikler, tek seferlik ödemeler ve daha fazlasını yönetin.',
      auth: {
        type: 'bearer_token',
        description: 'Stripe API, kimlik doğrulaması için API anahtarlarını kullanır. İstekler, "Authorization: Bearer YOUR_SECRET_KEY" başlığı ile doğrulanmalıdır.',
        params: [
          {
            name: 'token',
            label: 'Stripe Secret Key',
            type: 'password',
            required: true,
            example: 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
          },
        ],
      },
      capabilities: [
        {
          name: 'Create Payment Intent',
          description: 'Bir ödeme işlemi başlatır ve ödemeyi tamamlamak için gereken adımları izler.',
          endpoint: 'https://api.stripe.com/v1/payment_intents',
          method: 'POST',
          params: [
            {
              name: 'amount',
              label: 'Amount (in cents)',
              type: 'number',
              required: true,
              example: '2000',
            },
            {
              name: 'currency',
              label: 'Currency',
              type: 'text',
              required: true,
              example: 'usd',
            },
          ],
        },
        {
          name: 'Retrieve a Customer',
          description: 'Mevcut bir müşterinin detaylarını kimlik (ID) numarasına göre alır.',
          endpoint: 'https://api.stripe.com/v1/customers/{id}',
          method: 'GET',
          params: [
            {
              name: 'id',
              label: 'Customer ID',
              type: 'text',
              required: true,
              example: 'cus_xxxxxxxxxxxxxx',
            },
          ],
        },
        {
          name: 'List all Products',
          description: 'Hesabınızdaki tüm ürünleri listeler.',
          endpoint: 'https://api.stripe.com/v1/products',
          method: 'GET',
          params: [
            {
              name: 'limit',
              label: 'Limit',
              type: 'number',
              required: false,
              example: '10',
            },
          ],
        },
      ],
      githubAnalysis: {
        popularSDKs: [
          {
            name: 'stripe-node',
            url: 'https://github.com/stripe/stripe-node',
            description: 'Stripe API için resmi Node.js kütüphanesi. TypeScript desteği ve kolay kullanım sunar.',
          },
          {
            name: 'stripe-python',
            url: 'https://github.com/stripe/stripe-python',
            description: 'Stripe API için resmi Python kütüphanesi.',
          },
        ],
        usageExample: 'const stripe = require(\'stripe\')(\'YOUR_SECRET_KEY\');',
      },
    },
  ],
]);