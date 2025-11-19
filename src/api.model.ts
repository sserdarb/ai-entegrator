export interface TestParam {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  default?: string;
  example?: string;
}

export interface AuthInfo {
  type: 'apiKey' | 'oauth2_client_credentials' | 'basic_auth' | 'bearer_token' | 'custom_multi_field' | 'none';
  description: string;
  tokenUrl?: string;
  params: TestParam[];
}

export interface Capability {
  name:string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params: TestParam[];
}

export interface SdkInfo {
  name: string;
  url: string;
  description: string;
}

export interface GeneratedIntegration {
  name: string;
  description: string;
  auth: AuthInfo;
  capabilities: Capability[];
  githubAnalysis?: {
    popularSDKs: SdkInfo[];
    usageExample: string;
  };
}

export interface ApiInfo {
  name: string;
  description: string;
  icon: string;
  url: string;
  category: string;
  sectors: string[];
  status: 'aktif' | 'sorun' | 'bakımda';
  pricing: {
    summary: string;
    details?: string[];
  };
  pricingType: 'Ücretsiz' | 'Ücretli';
  integrationTip: string;
  apiKeyGuide: {
    description: string;
    url: string;
  };
  aiStudioRecommended: boolean;
  codeExample: {
    language: string;
    code: string;
  };
}

// FIX: Added PostmanCollection interface to resolve import error in gemini.service.ts
export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
    description?: string;
  };
  item: {
    name: string;
    request: {
      method: string;
      header: { key: string; value: string }[];
      body?: {
        mode: string;
        raw: string;
      };
      url: {
        raw: string;
        host: string[];
        path: string[];
        query?: { key: string; value: string }[];
      };
    };
  }[];
  auth?: {
    type: string;
    bearer?: { key: string; value: string; type: string }[];
    basic?: { key: string; value: string; type: string }[];
  };
}

export interface User {
  username: string;
  role: 'Admin' | 'User';
}

export interface ApiBridge {
  name: string;
  sourceApi: string;
  sourceCapability: string;
  targetApi: string;
  targetCapability: string;
  // Further details like data mapping can be added here
}