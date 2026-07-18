import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";
import { TravelPlanResponse, TravelQuery, FlightOffer, HotelOffer } from './api.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly travelMatePrompt: string;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    this.travelMatePrompt = `
      Sen "TravelMate" adında, Amadeus GDS verileriyle desteklenen, çözüm odaklı ve empatik bir Seyahat Asistanısın. Görevin, bir Backend-for-Frontend (BFF) ve Paketleme Motoru (Packaging Engine) gibi çalışmaktır.

      GÖREV TANIMI:
      Tek bir istekte, hem gerçekçi veri havuzları oluşturmalı, hem de bu havuzları analiz ederek kullanıcıya en uygun seyahat paketlerini sunmalısın. Bu, HPackage API mantığına benzer: önce müsaitlikleri bul, sonra bunları paketle.

      İŞ AKIŞI:
      1.  **Sanal Veri Havuzu Oluşturma (İç Simülasyon):** Kullanıcı girdilerine dayanarak, İLK ÖNCE kendi içinde aşağıdaki sanal veri havuzlarını oluştur:
          // FIX: Replaced backticks with single quotes to avoid TypeScript parsing errors in the template literal.
          -   'flight_options': Gerçekçi havayolları, saatler ve fiyatlar (TL) içeren 5-7 adet uçuş alternatifi.
          -   'hotel_options': Farklı tarzlarda, yıldızlarda ve konumlarda 8-10 adet otel alternatifi.
      
      2.  **Analiz ve Paketleme:** OLUŞTURDUĞUN BU HAVUZLARI kullanarak, kullanıcı bütçesini ve profilini analiz et. Toplam maliyet = (Kişi Sayısı * Uçak Fiyatı) + (Gece Sayısı * Otel Gecelik Fiyatı).

      3.  **Kürasyon ve Strateji:** HAVUZDAKİ verilerden SEÇİM YAPARAK 2-3 adet "interactive_cards" (seyahat paketi) oluştur. Her kart farklı bir stratejiyi yansıtmalı:
          -   **En İyi Fiyat/Performans:** Bütçeye en uygun, akıllıca seçilmiş uçuş ve otel kombinasyonu.
          -   **Konfor Odaklı:** Belki biraz daha pahalı ama daha iyi uçuş saatleri ve daha yüksek puanlı bir otel içeren seçenek.
          -   **Ekonomik Kaçamak:** En düşük maliyetli seçenek, belki daha az ideal uçuş saatleri veya merkezi olmayan bir otel içerir ama bütçeyi korur.

      4.  **Asistan İletişimi:** Kullanıcıyla empatik bir dille konuş. Bütçe aşıldıysa, oluşturduğun paketlerin nasıl akıllıca çözümler sunduğunu anlat. ("Merkezdeki otel yerine metroya yakın olanı seçerek bütçenizi korudum" gibi).

      5.  **Detayları Doldurma:** Her "interactive_card" için, havuzdan seçtiğin spesifik uçuş ve otel bilgilerini EKSİKSİZ şekilde ilgili alanlara doldur.

      ÇIKTI FORMATI (JSON):
      Cevabını, aşağıdaki JSON şemasına harfiyen uyarak ver. Başka hiçbir metin, açıklama veya markdown \`\`\`json bloğu ekleme. Sadece saf JSON döndür.
    `;
  }

  private getTravelDurationInNights(startDate: string, endDate:string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 1; // Return 1 night for invalid or backward dates
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  async generateLuckyDipSuggestion(departureCity: string): Promise<{ destination: string, budget: number }> {
    const prompt = `Bir kullanıcı "${departureCity}" şehrinden yola çıkarak sürpriz bir seyahat yapmak istiyor. Onun için 2 kişi, 7 gecelik bir tatil için hem ilginç bir destinasyon öner hem de bu tatil için mantıklı bir toplam bütçe (TL cinsinden) belirle. Sadece destinasyon ve bütçe içeren bir JSON objesi döndür. Başka hiçbir açıklama ekleme. Örnek: {"destination": "Lizbon", "budget": 85000}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            destination: { 
                type: Type.STRING, 
                description: "The suggested travel destination city." 
            },
            budget: { 
                type: Type.NUMBER,
                description: "The suggested total budget in Turkish Lira (TL) for a 7-night trip for 2 people."
            }
        },
        required: ['destination', 'budget']
    };

    try {
        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch(e) {
        console.error(`Failed to generate lucky dip suggestion:`, e);
        // Provide a fallback suggestion
        return { destination: 'Prag', budget: 60000 };
    }
  }

  async getTravelPlan(query: TravelQuery): Promise<TravelPlanResponse> {
    const durationNights = this.getTravelDurationInNights(query.departureDate, query.returnDate);

    const userContext = `
      KULLANICI GİRDİLERİ:
      - Kalkış Şehri: ${query.departureCity}
      - Gidilecek Yer: ${query.destination}
      - Kişi Sayısı: ${query.pax}
      - Gece Sayısı: ${durationNights}
      - Toplam Bütçe: ${query.budget.toLocaleString('tr-TR')} TL
      - Hayali: Bütçesine uygun, en iyi fiyat/performans/deneyim dengesine sahip bir tatil yapmak.
    `;

    const fullPrompt = `${this.travelMatePrompt}\n${userContext}`;
    
    const hotelDetailsSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            rating: { type: Type.NUMBER },
            location: { type: Type.STRING, enum: ['Merkez', 'Metroya Yakın', 'Havaalanı Yakını', 'Sakin Bölge'] },
            pricePerNight: { type: Type.NUMBER },
            style: { type: Type.STRING, enum: ['Lüks', 'Butik', 'Ekonomik', 'İş'] },
            description: { type: Type.STRING },
            amenities: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['name', 'rating', 'location', 'pricePerNight', 'style', 'description', 'amenities']
    };

    const schema = {
      type: Type.OBJECT,
      properties: {
        assistant_reply: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['success', 'negotiation_needed'] },
        budget_analysis: {
          type: Type.OBJECT,
          properties: {
            original_cost: { type: Type.NUMBER },
            user_budget: { type: Type.NUMBER },
            gap: { type: Type.NUMBER }
          },
          required: []
        },
        interactive_cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              badge: { type: Type.STRING },
              title: { type: Type.STRING },
              details_summary: { type: Type.STRING },
              total_price: { type: Type.NUMBER },
              why_this_option: { type: Type.STRING },
              flight_details: {
                  type: Type.OBJECT,
                  properties: {
                      airline: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      departureTime: { type: Type.STRING },
                      returnTime: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['direct', 'connecting'] },
                      pricePerPerson: { type: Type.NUMBER }
                  },
                  required: ['airline', 'duration', 'departureTime', 'returnTime', 'type', 'pricePerPerson']
              },
              primary_hotel: hotelDetailsSchema,
              alternative_hotels: {
                  type: Type.ARRAY,
                  items: hotelDetailsSchema
              }
            },
            required: ['id', 'badge', 'title', 'details_summary', 'total_price', 'why_this_option', 'flight_details', 'primary_hotel']
          }
        }
      },
      required: ['assistant_reply', 'status', 'interactive_cards']
    };

    const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });
    
    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TravelPlanResponse;
    } catch (e) {
        console.error("Failed to parse Gemini response:", response.text, e);
        throw new Error("Yapay zekadan gelen yanıt işlenemedi. Lütfen tekrar deneyin.");
    }
  }
}