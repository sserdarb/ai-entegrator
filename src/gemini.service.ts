import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, throwError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { KNOWLEDGE_BASE } from './api-knowledge-base';
import { GeneratedIntegration, Capability, PostmanCollection } from './api.model';


@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  public lastConstructedUrl: string = '';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  private stripMarkdown(text: string): string {
    const codeBlockRegex = /```(?:typescript|javascript|json|php|jsx|js|python|bash|graphql)?\s*([\s\S]*?)\s*```/;
    const match = text.match(codeBlockRegex);
    if (match) {
      return match[1].trim();
    }
    return text.trim();
  }

  async generateIntegrationPlan(apiName: string): Promise<GeneratedIntegration> {
    const normalizedApiName = apiName.trim().toLowerCase();
    const knowledgeBaseEntryKey = Array.from(KNOWLEDGE_BASE.keys()).find(key => key.toLowerCase().includes(normalizedApiName));
    
    if (knowledgeBaseEntryKey) {
      console.log(`Using pre-defined integration plan for: ${apiName}`);
      return Promise.resolve(KNOWLEDGE_BASE.get(knowledgeBaseEntryKey)!);
    }
    console.log(`No pre-defined plan for "${apiName}". Querying Gemini AI...`);
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        auth: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            description: { type: Type.STRING },
            tokenUrl: { type: Type.STRING },
            params: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  example: { type: Type.STRING },
                },
                required: ['name', 'label', 'type', 'required'],
              },
            },
          },
          required: ['type', 'description', 'params'],
        },
        capabilities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              endpoint: { type: Type.STRING },
              method: { type: Type.STRING },
              params: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    label: { type: Type.STRING },
                    type: { type: Type.STRING },
                    required: { type: Type.BOOLEAN },
                    example: { type: Type.STRING },
                  },
                  required: ['name', 'label', 'type', 'required'],
                },
              },
            },
            required: ['name', 'description', 'endpoint', 'method', 'params'],
          },
        },
        githubAnalysis: {
            type: Type.OBJECT,
            properties: {
                popularSDKs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            url: { type: Type.STRING },
                            description: { type: Type.STRING },
                        },
                        required: ['name', 'url', 'description']
                    }
                },
                usageExample: { type: Type.STRING }
            },
            required: ['popularSDKs', 'usageExample']
        }
      },
      required: ['name', 'description', 'auth', 'capabilities'],
    };

    const prompt = `
        Sen, API entegrasyonları konusunda uzman, kıdemli bir yazılım mühendisisin.
        Kullanıcının isteği olan "${apiName}" için kapsamlı bir API entegrasyon planı oluştur.
        
        SÜREÇ:
        1.  **DOKÜMANTASYON ANALİZİ:** Bu API'nin resmi dokümantasyonunu, Postman koleksiyonlarını ve web'deki en iyi pratikleri analiz et.
        2.  **KİMLİK DOĞRULAMA (AUTH):** API'nin kimlik doğrulama yöntemini (apiKey, OAuth 2.0, Basic Auth, Tourvisio gibi özel çoklu alanlar vb.) doğru bir şekilde tespit et. 'auth.params' dizisini, bu kimlik doğrulaması için kullanıcıdan alınması gereken tüm alanlarla (örn: Client ID, Client Secret, Agency Code, LoginName, Password) doldur.
        3.  **YETENEKLER (CAPABILITIES):** API'nin sunduğu en önemli ve en yaygın kullanılan 3 ila 5 temel yeteneği (capability) belirle. Her yetenek için, onun ne işe yaradığını, HTTP metodunu, endpoint'ini ve o yeteneğe özel olarak kullanıcıdan alınması gereken parametreleri ('capabilities.params' dizisi) doldur.
        4.  **ÖRNEK DEĞERLER:** Her bir parametre için (auth.params ve capabilities.params içindekiler), kullanıcıya yol göstermesi amacıyla mantıklı ve açıklayıcı bir "example" değeri (örn: "user-12345" veya "Bir şehir adı girin") oluştur.
        5.  **GITHUB ANALİZİ:** GitHub'ı bu API için en popüler ve en çok kullanılan SDK'lar (resmi veya topluluk) için tara. En iyi 2-3 tanesini bul, 'githubAnalysis' alanını bu SDK'ların bilgileri ve en popüler olanı için bir başlangıç/yapılandırma kodu örneği ile doldur.
        
        Sonucu, verilen JSON şemasına tam olarak uyacak şekilde döndür. Açıklama yapma, sadece JSON döndür.
    `;
    
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    try {
      const jsonResponse = JSON.parse(response.text.trim());
      return jsonResponse as GeneratedIntegration;
    } catch (e) {
      console.error("Failed to parse Gemini response:", response.text, e);
      throw new Error("AI'den gelen yanıt JSON formatında değil.");
    }
  }

  async liveApiCall(integration: GeneratedIntegration, capability: Capability, params: Record<string, any>): Promise<{ response: any, accessToken?: string, requestUrl: string, responseTime: number }> {
    let accessToken: string | undefined;
    const { auth } = integration;
    
    // 1. Adım: Gerekirse Access Token Al
    if (auth.type === 'oauth2_client_credentials' && auth.tokenUrl) {
      const tokenBody = new URLSearchParams();
      tokenBody.set('grant_type', 'client_credentials');
      auth.params.forEach(p => {
        if (params[p.name]) {
          const snakeCaseName = p.name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          tokenBody.set(snakeCaseName, params[p.name]);
        }
      });
      
      const tokenResponse: any = await firstValueFrom(this.http.post(auth.tokenUrl, tokenBody.toString(), {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      }));
      accessToken = tokenResponse.access_token;
    }

    // 2. Adım: Asıl API Çağrısını Hazırla
    let finalUrl = capability.endpoint;
    let finalHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
    let finalParams = new HttpParams();
    let body: any = null;
    
    const allParams = { ...params };
    
    if (accessToken) {
      finalHeaders = finalHeaders.set('Authorization', `Bearer ${accessToken}`);
    } else if (auth.type === 'bearer_token' && allParams.token) {
      finalHeaders = finalHeaders.set('Authorization', `Bearer ${allParams.token}`);
    } else if (auth.type === 'apiKey' && allParams.apiKey) {
      finalHeaders = finalHeaders.set(auth.params.find(p => p.name === 'apiKey')?.label || 'X-API-KEY', allParams.apiKey);
    } else if (auth.type === 'basic_auth' && allParams.username && allParams.password) {
      finalHeaders = finalHeaders.set('Authorization', 'Basic ' + btoa(`${allParams.username}:${allParams.password}`));
    }
    
    const combinedParams = [...auth.params, ...capability.params];
    const bodyParams: Record<string, any> = {};

    for (const key in allParams) {
      const paramDef = combinedParams.find(p => p.name === key);
      if (!paramDef) continue;
      
      const placeholder = new RegExp(`{${key}}`);
      if (finalUrl.includes(`{${key}}`)) {
        finalUrl = finalUrl.replace(placeholder, encodeURIComponent(allParams[key]));
      } else if (capability.method === 'GET') {
        finalParams = finalParams.set(key, allParams[key]);
      } else {
        if(!auth.params.some(p => p.name === key)) {
          bodyParams[key] = allParams[key];
        }
      }
    }
    
    if (capability.method !== 'GET' && Object.keys(bodyParams).length > 0 || auth.type === 'custom_multi_field') {
      let finalBody = bodyParams;
      if (auth.type === 'custom_multi_field') {
         auth.params.forEach(p => {
            if(params[p.name]) finalBody[p.name] = params[p.name];
         });
      }
      body = finalBody;
    }

    let fullRequestUrl = finalUrl;
    if (finalParams.keys().length > 0) {
        fullRequestUrl += `?${finalParams.toString()}`;
    }
    this.lastConstructedUrl = fullRequestUrl;
    
    // 3. Adım: API Çağrısını Yap
    const options = { headers: finalHeaders, params: finalParams };
    let apiResponse$: any;
    
    const connectionSettings = this.authService.apiConnectionSettings()[integration.name];
    const requestTimeout = connectionSettings?.timeout ?? 30000;

    switch (capability.method) {
      case 'GET': apiResponse$ = this.http.get(finalUrl, options); break;
      case 'POST': apiResponse$ = this.http.post(finalUrl, body, options); break;
      case 'PUT': apiResponse$ = this.http.put(finalUrl, body, options); break;
      case 'DELETE': apiResponse$ = this.http.delete(finalUrl, options); break;
      default: throw new Error(`${capability.method} metodu desteklenmiyor.`);
    }

    const startTime = performance.now();
    try {
        const apiResponse = await firstValueFrom(apiResponse$.pipe(timeout(requestTimeout)));
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        return { response: apiResponse, accessToken, requestUrl: this.lastConstructedUrl, responseTime };
    } catch(error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        if (error instanceof HttpErrorResponse) {
            const enrichedError = { ...error, responseTime };
            throw enrichedError;
        } else {
            throw { message: (error as Error).message, status: 0, error: {}, responseTime };
        }
    }
  }
  
  async fixFailedCapability(integration: GeneratedIntegration, capability: Capability, error: any): Promise<string> {
    const prompt = `
      Sen, deneyimli bir API entegrasyonu uzmanısın. Bir API çağrısı başarısız oldu.
      Aşağıdaki bilgileri kullanarak sorunun ne olabileceğini analiz et ve Markdown formatında, kod blokları kullanarak çözümü için net, uygulanabilir bir öneride bulun.

      API Planı: ${JSON.stringify(integration, null, 2)}
      Başarısız Olan Yetenek: ${JSON.stringify(capability, null, 2)}
      Gelen Hata: ${JSON.stringify(error, null, 2)}

      Çözüm Önerisi (Markdown formatında):
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  }
  
  async generateStandaloneService(integration: GeneratedIntegration): Promise<string> {
    const prompt = `
        Sen, modern Angular konusunda uzman, kıdemli bir frontend mühendisisin.
        Aşağıdaki API entegrasyon planını kullanarak, Angular v17+ için 'standalone' ve 'zoneless' bir servis oluştur.
        - Servis, \`@Injectable({ providedIn: 'root' })\` dekoratörünü kullanmalı.
        - HTTP istekleri için Angular'ın \`HttpClient\`'ını kullanmalı. Constructor'da \`private http = inject(HttpClient);\` şeklinde enjekte et.
        - Planda belirtilen HER BİR YETENEK (capability) için ayrı bir public metot oluştur. Metot adı yeteneğin adından (örn: searchUsers) türetilmeli.
        - Her metot, hem kimlik doğrulama hem de yeteneğe özel parametreleri almalı ve bir Observable<any> döndürmeli.
        - Sonuç sadece ve sadece geçerli, tam bir TypeScript kodu olmalı. Açıklama veya markdown kod bloğu içermemeli.

        API Entegrasyon Planı:
        ${JSON.stringify(integration)}
    `;
    
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return this.stripMarkdown(response.text);
  }

  async regenerateCodeForFramework(angularCode: string, framework: 'React' | 'Vue', plan: GeneratedIntegration): Promise<string> {
      const target = framework === 'React' 
        ? 'bir React Hook (fonksiyonel bileşen içinde kullanılacak şekilde)' 
        : 'bir Vue Composable (setup fonksiyonu içinde kullanılacak şekilde)';

      const prompt = `
        Sen, React ve Vue konusunda uzman, kıdemli bir frontend mühendisisin.
        Aşağıdaki Angular servisini al ve onu ${target} haline dönüştür.
        - HTTP istekleri için 'axios' kullan.
        - Angular servisindeki her bir public metot için, React Hook/Vue Composable içinde karşılık gelen bir fonksiyon oluştur.
        - Sonuç sadece ve sadece geçerli bir JavaScript/TypeScript kodu olmalı. Açıklama veya markdown bloğu içermemeli.

        API Bilgisi: ${JSON.stringify(plan)}
        
        Dönüştürülecek Angular Kodu:
        \`\`\`typescript
        ${angularCode}
        \`\`\`
      `;
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return this.stripMarkdown(response.text);
  }

  async regenerateForWordPress(integration: GeneratedIntegration): Promise<string> {
    const prompt = `
      Sen, WordPress eklenti geliştirme konusunda uzman ve talimatları harfiyen uygulayan bir PHP geliştiricisisin.
      Aşağıdaki API entegrasyon planını kullanarak, son kullanıcının API anahtarlarını ASLA koda yazmak zorunda kalmayacağı, çalışmaya hazır, tek bir PHP dosyası olan bir WordPress eklentisi oluştur.

      ZORUNLU GEREKSİNİMLER:

      1.  **Eklenti Başlığı:** Kodun başında standart WordPress eklenti başlık bilgilerini (Plugin Name, Description vb.) içermelidir.

      2.  **DİNAMİK YÖNETİM AYARLARI SAYFASI:** Bu en önemli adımdır.
          a. WordPress'in "Ayarlar" menüsü altına, eklenti için özel bir yönetim sayfası ekle (\`add_options_page\`). Sayfa başlığı "[API Adı] Ayarları" gibi olmalı.
          b. Bu ayarlar sayfası, sana verilen JSON planındaki \`auth.params\` dizisi üzerinde döngü kurarak **dinamik olarak oluşturulmalıdır**.
          c. \`auth.params\` dizisindeki **HER BİR OBJE İÇİN**, WordPress Settings API'sini (\`register_setting\`, \`add_settings_section\`, \`add_settings_field\`) kullanarak karşılık gelen bir form alanı oluşturmalısın.
          d. Form alanını oluştururken:
              - Objenin \`label\` özelliğini, form alanının etiketi olarak kullan.
              - Objenin \`name\` özelliğini, \`register_setting\` için ve daha sonra değeri almak için kullanılacak \`get_option\` fonksiyonu için anahtar olarak kullan. (Örn: \`get_option('api_key')\`)
          e. Kullanıcı bu formu kaydettiğinde, girilen değerler WordPress veritabanında \`update_option\` ile güvenli bir şekilde saklanmalıdır.

      3.  **Akıllı Shortcode'lar:**
          a. Plandaki HER BİR YETENEK (capability) için ayrı bir shortcode (\`[shortcode_adi]\`) oluştur.
          b. API çağrısı yapmadan ÖNCE, shortcode fonksiyonu içinde, 2. adımda kaydedilen kimlik doğrulama bilgilerini **MUTLAKA** \`get_option()\` ile çekmelidir. API anahtarları asla koda sabit yazılmamalıdır.
          c. API çağrılarını yapmak için WordPress'in HTTP API'sini (\`wp_remote_get\`, \`wp_remote_post\`) kullanmalı ve alınan kimlik bilgilerini doğru başlık (header) veya gövde (body) parametresi olarak eklemelidir.

      4.  **Kullanıcı Dostu Talimatlar:**
          a. Kodun en başında, kullanıcıya eklentiyi etkinleştirdikten sonra **"Ayarlar > [API Adı] Ayarları"** menüsüne giderek kimlik bilgilerini girmesi gerektiğini açıkça anlatan, güncellenmiş talimatlar içeren bir PHP yorum bloğu olmalıdır.

      5.  **Çıktı Formatı:** Sonuç sadece ve sadece geçerli, tam bir PHP kodu olmalıdır. Açıklama veya markdown bloğu içermemelidir.

      API Entegrasyon Planı:
      ${JSON.stringify(integration)}
    `;
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return this.stripMarkdown(response.text);
  }

  async regenerateForBackendFramework(framework: 'Node.js' | 'Python', integration: GeneratedIntegration): Promise<string> {
    const target = framework === 'Node.js'
      ? 'bir Express.js router dosyası. İstekleri karşılamalı, `axios` ile harici API\'ye bağlanmalı ve sonucu JSON olarak döndürmeli.'
      : 'basit bir Flask uygulama dosyası. `requests` kütüphanesini kullanarak API çağrısı yapmalı ve sonucu `jsonify` ile sunmalı.';
    
    const dependencies = framework === 'Node.js' ? 'axios, express' : 'Flask, requests';
    const env_vars = 'API anahtarı gibi hassas bilgilerin ortam değişkenlerinden (environment variables) nasıl okunacağını gösteren yorumlar ekle.';
    const instructions = `Bağımlılıkların (\`${dependencies}\`) nasıl kurulacağını ve ${env_vars}`;

    const prompt = `
      Sen, ${framework} konusunda uzman, kıdemli bir backend mühendisisin.
      Aşağıdaki API entegrasyon planını kullanarak, çalışmaya hazır, tek bir dosya olan ${target} oluştur.

      Gereksinimler:
      1. Planda belirtilen HER BİR YETENEK (capability) için ayrı bir route/endpoint oluştur.
      2. Plandaki kimlik doğrulama (auth) şemasını doğru bir şekilde uygula.
      3. Kodun en başında, ${instructions} ve sunucunun nasıl çalıştırılacağına dair net talimatlar içeren bir yorum bloğu olmalı.
      4. Sonuç sadece ve sadece geçerli, tam bir ${framework === 'Node.js' ? 'JavaScript' : 'Python'} kodu olmalı. Açıklama veya markdown bloğu içermemeli.

      API Entegrasyon Planı:
      ${JSON.stringify(integration)}
    `;
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return this.stripMarkdown(response.text);
  }
  
  async generatePostmanCollection(integration: GeneratedIntegration): Promise<PostmanCollection> {
      const prompt = `
        Sen, Postman ve API testleri konusunda uzman bir DevOps mühendisisin.
        Aşağıdaki API entegrasyon planını, Postman Collection v2.1.0 JSON şemasına uygun bir JSON nesnesine dönüştür.
        
        ZORUNLU GEREKSİNİMLER:
        1.  **Collection Info:** Koleksiyonun 'info' alanı, API'nin adını (\`name\`) ve açıklamasını (\`description\`) içermelidir.
        2.  **Authorization:**
            *   Eğer auth tipi 'bearer_token', 'apiKey' veya benzeriyse, koleksiyonun en üst seviyesindeki 'auth' nesnesini 'bearer' tipi olarak ayarla ve token değeri olarak \`{{${integration.auth.params[0]?.name || 'apiKey'}}}\` gibi bir Postman değişkeni kullan.
            *   Eğer auth tipi 'basic_auth' ise, 'auth' nesnesini 'basic' tipi olarak ayarla ve \`{{username}}\` ve \`{{password}}\` değişkenlerini kullan.
            *   Diğer durumlar için (örn: OAuth 2.0, custom_multi_field), en üst seviye 'auth' nesnesini boş bırak. Bu endpoint bazında ele alınacak.
        3.  **Items (Requests):** Plandaki HER BİR YETENEK (capability) için 'item' dizisinde bir request (istek) nesnesi oluştur.
            *   Her 'item', yeteneğin adını (\`name\`) taşımalı.
            *   'request' nesnesi, HTTP metodunu (\`method\`) ve URL'yi (\`url\`) içermelidir.
            *   URL'yi oluştururken, endpoint yolundaki \`{param}\` gibi yer tutucuları \`:param\` formatına dönüştür (örn: \`/users/{id}\` -> \`/users/:id\`).
            *   GET isteklerindeki parametreleri, 'url.query' dizisine ekle.
            *   POST/PUT isteklerindeki parametreleri, 'request.body.raw' içinde bir JSON string olarak ekle. Değerler için \`"{{paramName}}"\` gibi Postman değişkenleri kullan.
        4.  **Değişkenler (Variables):** API anahtarları gibi hassas bilgileri ASLA doğrudan JSON'a yazma. Her zaman \`{{variableName}}\` formatında Postman değişkenleri kullan.
        5.  **Çıktı Formatı:** Sonuç, sadece ve sadece geçerli, tam bir JSON nesnesi olmalıdır. Açıklama veya markdown bloğu içermemelidir.
        
        API Entegrasyon Planı:
        ${JSON.stringify(integration)}
    `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          info: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, schema: { type: Type.STRING }, description: { type: Type.STRING } } },
          item: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                request: {
                  type: Type.OBJECT,
                  properties: {
                    method: { type: Type.STRING },
                    header: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } },
                    body: { type: Type.OBJECT, properties: { mode: { type: Type.STRING }, raw: { type: Type.STRING } } },
                    url: { type: Type.OBJECT, properties: { raw: { type: Type.STRING }, host: { type: Type.ARRAY, items: { type: Type.STRING } }, path: { type: Type.ARRAY, items: { type: Type.STRING } }, query: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } }
                  }
                }
              }
            }
          },
          auth: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, bearer: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING }, type: { type: Type.STRING } } } }, basic: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING }, type: { type: Type.STRING } } } } } }
        }
      };

      const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: schema
          }
      });
      
      try {
        return JSON.parse(response.text.trim()) as PostmanCollection;
      } catch (e) {
         console.error("Failed to parse Postman collection from Gemini:", response.text, e);
         throw new Error("AI'den gelen Postman koleksiyonu JSON formatında değil.");
      }
  }
}
