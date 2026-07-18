import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe, DatePipe } from '@angular/common';

import { GeminiService } from './gemini.service';
import { FlightService } from './flight.service';
import { TravelQuery, TravelPlanResponse, FlightOffer, HotelOffer, InteractiveCard, HotelDetails } from './api.model';

type ViewState = {
  loading: boolean;
  error: string | null;
  response: TravelPlanResponse | null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    JsonPipe,
    DatePipe,
  ],
  template: `
<main class="min-h-screen">
  <!-- Planner Section -->
  <section id="planner" class="relative min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
    <div class="absolute top-4 right-4 z-10">
        <button (click)="toggleTheme()" class="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-stone-200/50 dark:hover:bg-gray-800/50 transition-colors">
            @if(theme() === 'dark') {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            } @else {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            }
        </button>
    </div>

    <div class="w-full max-w-7xl mx-auto z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <!-- Left: Planning Panel -->
            <div class="bg-white/40 dark:bg-stone-900/40 backdrop-blur-2xl p-8 rounded-2xl shadow-2xl shadow-stone-900/10 dark:shadow-black/20 border border-white/50 dark:border-stone-800/50">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="h-8 w-8 text-sky-600 dark:text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    <span class="text-2xl font-bold text-gray-900 dark:text-white">TravelMate</span>
                </div>
                <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    <span class="block">Hayalinizdeki Rota,</span>
                    <span class="block text-sky-600 dark:text-sky-400">Sizin İçin Tasarlandı.</span>
                </h1>
                <p class="mt-3 text-gray-600 dark:text-stone-300">
                    Yapay zeka ile kişiselleştirilmiş seyahat deneyimleri oluşturun.
                </p>

                <!-- Mode Tabs -->
                <div class="my-6 border-b border-stone-300 dark:border-stone-700 flex items-center gap-6">
                    <button (click)="setPlanningMode('detailed')" class="pb-2 text-sm font-semibold border-b-2 transition-colors" [class]="planningMode() === 'detailed' ? 'text-sky-600 dark:text-sky-400 border-sky-500' : 'text-gray-500 dark:text-stone-400 border-transparent hover:text-sky-600 dark:hover:text-sky-400'">
                        Detaylı Plan
                    </button>
                    <button (click)="setPlanningMode('lucky')" class="pb-2 text-sm font-semibold border-b-2 transition-colors" [class]="planningMode() === 'lucky' ? 'text-sky-600 dark:text-sky-400 border-sky-500' : 'text-gray-500 dark:text-stone-400 border-transparent hover:text-sky-600 dark:hover:text-sky-400'">
                        Şanslı Keşif
                    </button>
                    <button (click)="setPlanningMode('flight')" class="pb-2 text-sm font-semibold border-b-2 transition-colors" [class]="planningMode() === 'flight' ? 'text-sky-600 dark:text-sky-400 border-sky-500' : 'text-gray-500 dark:text-stone-400 border-transparent hover:text-sky-600 dark:hover:text-sky-400'">
                        Uçuş Ara
                    </button>
                </div>

                @if (planningMode() === 'flight') {
                  <div class="space-y-4">
                       <fieldset>
                          <legend class="form-legend">Nereden Nereye</legend>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="text" [ngModel]="flightQuery().origin" (ngModelChange)="updateFlightQueryField('origin', $event)" class="form-input" placeholder="Kalkış Şehri (örn: İstanbul)">
                              <input type="text" [ngModel]="flightQuery().destination" (ngModelChange)="updateFlightQueryField('destination', $event)" class="form-input" placeholder="Varış Şehri (örn: Paris)">
                          </div>
                       </fieldset>
                       <fieldset>
                          <legend class="form-legend">Tarihler</legend>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="date" [ngModel]="flightQuery().departureDate" (ngModelChange)="updateFlightQueryField('departureDate', $event)" class="form-input">
                              <input type="date" [ngModel]="flightQuery().returnDate" (ngModelChange)="updateFlightQueryField('returnDate', $event)" class="form-input">
                          </div>
                       </fieldset>
                       <fieldset>
                          <legend class="form-legend">Yolcular</legend>
                          <div class="grid grid-cols-1 gap-4">
                              <input type="number" min="1" [ngModel]="flightQuery().adults" (ngModelChange)="updateFlightQueryField('adults', $event)" class="form-input" placeholder="Yetişkin Sayısı">
                          </div>
                       </fieldset>
                  </div>
                  <div class="mt-6">
                       <button (click)="submitFlightSearch()" class="form-button" [disabled]="flightViewState().loading">
                           <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                           <span>Uçuşları Bul</span>
                       </button>
                  </div>
                } @else {
                  <div class="space-y-4">
                       <!-- Location -->
                       <fieldset>
                          <legend class="form-legend">Destinasyon</legend>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="text" [ngModel]="query().departureCity" (ngModelChange)="updateQueryField('departureCity', $event)" class="form-input" placeholder="Nereden?">
                              <input type="text" [ngModel]="query().destination" (ngModelChange)="updateQueryField('destination', $event)" class="form-input" placeholder="Nereye?">
                          </div>
                       </fieldset>
                        <!-- Dates -->
                       <fieldset>
                          <legend class="form-legend">Tarihler</legend>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="date" [ngModel]="query().departureDate" (ngModelChange)="updateQueryField('departureDate', $event)" class="form-input">
                              <input type="date" [ngModel]="query().returnDate" (ngModelChange)="updateQueryField('returnDate', $event)" class="form-input">
                          </div>
                       </fieldset>
                       <!-- Details -->
                       <fieldset>
                          <legend class="form-legend">Detaylar</legend>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <input type="number" min="1" [ngModel]="query().pax" (ngModelChange)="updateQueryField('pax', $event)" class="form-input" placeholder="Kaç Kişi?">
                              <input type="number" step="1000" [ngModel]="query().budget" (ngModelChange)="updateQueryField('budget', $event)" class="form-input" placeholder="Bütçeniz (₺)">
                          </div>
                       </fieldset>
                  </div>
  
                  <div class="mt-6">
                       <button (click)="submitPlanRequest()" class="form-button" [disabled]="viewState().loading">
                           <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                           <span>
                              @if (planningMode() === 'lucky') {
                                  Bana Bir Sürpriz Yap
                              } @else {
                                  Yolculuğumu Planla
                              }
                           </span>
                       </button>
                  </div>
                }
            </div>
            <!-- Right: Inspiration Panel -->
            <div class="hidden lg:block aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-stone-900/10 dark:shadow-black/20">
                <div class="h-full w-full bg-cover bg-center ken-burns-image" [style.background-image]="'url(https://picsum.photos/800/800?random=1)'"></div>
            </div>
        </div>
    </div>
  </section>

    <!-- Sonuç Alanı -->
    <section class="py-16 sm:py-24 w-full bg-stone-100 dark:bg-stone-900/50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        @if (planningMode() === 'flight') {
          @if (flightViewState().loading) {
            <div class="flex flex-col items-center gap-4 text-center p-12">
                <div class="relative w-48 h-24 flex justify-around items-center">
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0s;" class="h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0.2s;" class="h-10 w-10 text-sky-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0.4s;" class="h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                </div>
                <p class="text-lg font-semibold text-gray-700 dark:text-stone-300 mt-6">
                    Uçuşlar aranıyor...
                </p>
            </div>
          } @else if(flightViewState().error; as error) {
            <div class="error-box max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <strong class="font-bold">Bir Sorun Oluştu!</strong>
                  <p class="text-sm">{{ error }}</p>
                </div>
            </div>
          } @else if(flightViewState().results; as results) {
            <div class="space-y-6">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Bulunan Uçuşlar ({{ results.length }})</h2>
              @if (results.length === 0) {
                <p class="text-gray-500 dark:text-stone-400">Aradığınız kriterlere uygun uçuş bulunamadı.</p>
              }
              @for(flight of results; track flight.id) {
                <div class="bg-white dark:bg-stone-800 rounded-xl shadow-md border border-stone-200 dark:border-stone-700 p-6">
                  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-sm font-semibold text-sky-600 dark:text-sky-400">{{ flight.itineraries[0].segments[0].carrierCode }}</span>
                        <span class="text-xs text-gray-500 dark:text-stone-400">{{ flight.itineraries[0].duration }}</span>
                      </div>
                      <div class="flex items-center gap-4">
                        <div class="text-center">
                          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ flight.itineraries[0].segments[0].departure.at | date:'HH:mm' }}</p>
                          <p class="text-sm text-gray-500 dark:text-stone-400">{{ flight.itineraries[0].segments[0].departure.iataCode }}</p>
                        </div>
                        <div class="flex-1 flex flex-col items-center px-4">
                          <div class="w-full h-px bg-stone-300 dark:bg-stone-600 relative">
                            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-stone-800 px-2 text-xs text-gray-400">
                              {{ flight.itineraries[0].segments.length === 1 ? 'Direkt' : (flight.itineraries[0].segments.length - 1) + ' Aktarma' }}
                            </div>
                          </div>
                        </div>
                        <div class="text-center">
                          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at | date:'HH:mm' }}</p>
                          <p class="text-sm text-gray-500 dark:text-stone-400">{{ flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="text-right border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-700 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                      <p class="text-sm text-gray-500 dark:text-stone-400">Toplam Fiyat</p>
                      <p class="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{{ flight.price.total }} {{ flight.price.currency }}</p>
                      <button class="mt-2 w-full bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-900/50 dark:hover:bg-sky-800/50 dark:text-sky-300 py-2 px-4 rounded-lg font-medium transition-colors">
                        Seç
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center p-12 ">
              <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-stone-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">Uçuş Aramaya Hazır Mısınız?</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-stone-400">Amadeus GDS verileriyle en uygun uçuşları bulun.</p>
            </div>
          }
        } @else {
          @if (viewState().loading) {
            <div class="flex flex-col items-center gap-4 text-center p-12">
                <div class="relative w-48 h-24 flex justify-around items-center">
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0s;" class="h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0.2s;" class="h-10 w-10 text-sky-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                    <svg style="animation: pulse-pin 2s ease-in-out infinite; animation-delay: 0.4s;" class="h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.27.615-.454L16 14.833V16a1 1 0 002 0v-4.5a1 1 0 00-1-1h-4.5a1 1 0 000 2H14v.667l-4.425 2.95a.75.75 0 01-.85 0L4 12.667V12h1.5a1 1 0 000-2H4a1 1 0 00-1 1v4.5a1 1 0 002 0v-1.167l4.385 2.923c.215.184.43.354.615.454.094.05.182.096.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v.51a4.515 4.515 0 014.23 4.23h.51a.75.75 0 010 1.5h-.51a4.515 4.515 0 01-4.23 4.23v.51a.75.75 0 01-1.5 0v-.51a4.515 4.515 0 01-4.23-4.23h-.51a.75.75 0 010-1.5h.51c.31-.03.614-.092.912-.186a.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002.124h-.002a.75.75 0 010-1.5h.002a3.015 3.015 0 001.002.124.75.75 0 01.593-1.348A4.52 4.52 0 015.5 7.51V7.25a.75.75 0 011.5 0v.51a3.015 3.015 0 001.002-.124.75.75 0 01.593 1.348 3.015 3.015 0 00-1.002-.124h-.002a.75.75 0 010-1.5h.002A3.015 3.015 0 008.5 6.262V5.75a.75.75 0 011.5 0v.51a4.52 4.52 0 014.23 1.248.75.75 0 01-1.06 1.06A3.018 3.018 0 0011.5 7.01V7.25a.75.75 0 01-1.5 0v-.51a3.015 3.015 0 00-1.002.124.75.75 0 01-.593-1.348A3.015 3.015 0 0010 5.636V5.75a.75.75 0 01-1.5 0V5.242A4.513 4.513 0 0110 2z" /></svg>
                </div>
                <p class="text-lg font-semibold text-gray-700 dark:text-stone-300 mt-6">
                    Size özel en iyi rotaları çiziyorum...
                </p>
                <p class="text-sm text-gray-500 dark:text-stone-400">Bu işlem biraz zaman alabilir, lütfen bekleyin.</p>
            </div>
          } @else if(viewState().error; as error) {
            <div class="error-box max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <strong class="font-bold">Bir Sorun Oluştu!</strong>
                  <p class="text-sm">{{ error }}</p>
                </div>
            </div>
          } @else if(viewState().response; as response) {
            <div class="space-y-8">
              <div class="flex items-start gap-4 max-w-3xl mx-auto">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-sky-500 dark:bg-sky-600 flex items-center justify-center text-white font-bold">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.455.09-.934.09-1.425v-2.287a6.75 6.75 0 016.75-6.75h2.25l.244-.027A5.972 5.972 0 0121 12z" /></svg>
                  </div>
                  <div class="flex-1 bg-white dark:bg-stone-800 rounded-lg p-4 text-gray-800 dark:text-stone-200 shadow-sm border border-stone-200 dark:border-stone-700/50">
                      <p [innerHTML]="formatAssistantReply(response.assistant_reply)"></p>
                  </div>
              </div>
              
              <div class="space-y-6">
                @for(card of response.interactive_cards; track card.id) {
                  <div class="bg-white/60 dark:bg-stone-800/60 backdrop-blur-lg border border-white/50 dark:border-stone-700/50 rounded-2xl shadow-lg hover:shadow-sky-500/10 dark:hover:shadow-sky-400/10 overflow-hidden transform hover:-translate-y-1 transition-all duration-300 group">
                    <div class="md:flex">
                      <div class="md:w-5/12">
                         <div class="h-full min-h-64 w-full bg-gray-200 dark:bg-stone-700 bg-cover bg-center" [style.background-image]="'url(https://picsum.photos/600/400?random='+card.id+')'"></div>
                      </div>
                      <div class="p-6 md:w-7/12 flex flex-col">
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <span class="card-badge" [class]="getBadgeColor(card.badge)">{{ card.badge }}</span>
                                <div class="text-right">
                                    <p class="text-sm text-gray-500 dark:text-stone-400">Toplam Maliyet</p>
                                    <p class="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{{ card.total_price.toLocaleString('tr-TR') }} ₺</p>
                                </div>
                            </div>
                            <h3 class="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{{ card.title }}</h3>
                            <p class="mt-1 text-sm text-gray-600 dark:text-stone-400">{{ card.details_summary }}</p>
                            <div class="mt-3 p-3 bg-stone-100 dark:bg-stone-900/40 rounded-lg border border-stone-200 dark:border-stone-700/50">
                              <h4 class="text-xs font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-300">Küratör Notu</h4>
                              <p class="mt-1 text-sm text-gray-700 dark:text-stone-300 italic">"{{ card.why_this_option }}"</p>
                            </div>
                        </div>
                        <button (click)="toggleCardDetails(card.id)" class="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center cursor-pointer w-full text-left">
                           <span class="font-semibold text-sky-600 dark:text-sky-400">Detayları Görüntüle</span>
                           <svg xmlns="http://www.w3.org/2000/svg" class="ml-4 h-6 w-6 text-gray-400 transition-transform duration-300" [class.rotate-180]="selectedCardId() === card.id" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                    </div>

                    @if(selectedCardId() === card.id) {
                      <div class="bg-stone-50 dark:bg-stone-800 px-6 pb-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                        <!-- Card details content here -->
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
           @else {
             <!-- Başlangıç Durumu -->
            <div class="text-center p-12 ">
              <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-stone-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.375a9.375 9.375 0 100-18.75 9.375 9.375 0 000 18.75zM9 13.125h6m-3-6.25v12.5" /></svg>
              <h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">Planlamaya Hazır Mısınız?</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-stone-400">Hayalinizdeki seyahati tasarlamak için küratör panelini kullanın.</p>
            </div>
          }
        }
      </div>
    </section>
</main>

<footer class="bg-transparent">
  <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-stone-400">
    &copy; {{ currentYear }} TravelMate. Tüm hakları saklıdır.
  </div>
</footer>
  `,
  styles: [`
  .form-legend {
      @apply block mb-1 text-xs font-medium text-gray-500 dark:text-stone-400;
  }
  .form-input {
    @apply h-11 block w-full text-sm rounded-lg border-stone-300 dark:border-stone-700 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50 bg-white/50 dark:bg-stone-800/50 text-gray-900 dark:text-stone-100 transition-colors;
  }
  .form-button {
    @apply w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:from-stone-400 disabled:to-stone-500 dark:disabled:from-stone-700 dark:disabled:to-stone-800 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-all duration-300 h-12 text-base shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30;
  }
  .error-box {
    @apply bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg flex items-center gap-3;
  }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private readonly queryStorageKey = 'travelmate_query';
  
  currentYear = new Date().getFullYear();

  // Form State
  query = signal<TravelQuery>({
    departureCity: 'İstanbul',
    destination: 'Paris',
    departureDate: this.getTodayString(),
    returnDate: this.getFutureDateString(7),
    pax: 2,
    budget: 50000,
  });

  // View States
  planningMode = signal<'detailed' | 'lucky' | 'flight'>('detailed');
  
  viewState = signal<ViewState>({
    loading: false,
    error: null,
    response: null,
  });

  // Flight Search State
  flightQuery = signal({
    origin: 'İstanbul',
    destination: 'Paris',
    departureDate: this.getTodayString(),
    returnDate: this.getFutureDateString(7),
    adults: 1
  });

  flightViewState = signal<{
    loading: boolean;
    error: string | null;
    results: any[] | null;
  }>({
    loading: false,
    error: null,
    results: null
  });

  private flightService = inject(FlightService);
  
  // Interactive State
  selectedCardId = signal<number | null>(null);
  
  // Modal State
  isModalVisible = signal(false);
  isModalAnimatingOut = signal(false);
  modalContent = signal<{ title: string; hotels: HotelDetails[] } | null>(null);

  // Theme
  theme = signal<'light' | 'dark'>('dark');

  private themeEffect = effect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = this.theme();
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  });

  private querySaveEffect = effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.queryStorageKey, JSON.stringify(this.query()));
    }
  });

  constructor() {
     // Load theme from local storage
     if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        this.theme.set(localStorage.getItem('theme') as 'light' | 'dark');
     }
     
    // Load query from local storage
    if (typeof window !== 'undefined') {
      const savedQuery = localStorage.getItem(this.queryStorageKey);
      if (savedQuery) {
        try {
          const parsedQuery: TravelQuery = JSON.parse(savedQuery);
          // Basic validation to ensure dates are not in the past
          const today = this.getTodayString();
          if (parsedQuery.departureDate < today || parsedQuery.returnDate < parsedQuery.departureDate) {
             // If dates are invalid, reset to default
             parsedQuery.departureDate = today;
             parsedQuery.returnDate = this.getFutureDateString(7);
          }
          this.query.set(parsedQuery);
        } catch(e) {
          console.error("Failed to parse saved query from local storage.", e);
          // If parsing fails, the default value will be used.
        }
      }
    }
  }
  
  // --- Methods ---
  
  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  setPlanningMode(mode: 'detailed' | 'lucky' | 'flight'): void {
    this.planningMode.set(mode);
    // Reset view states when switching modes
    this.viewState.set({ loading: false, error: null, response: null });
    this.flightViewState.set({ loading: false, error: null, results: null });
    this.selectedCardId.set(null);
  }

  updateQueryField<K extends keyof TravelQuery>(key: K, value: TravelQuery[K]): void {
    // Ensure numeric values are stored as numbers
    const updatedValue = (key === 'pax' || key === 'budget') ? Number(value) : value;
    this.query.update(q => ({ ...q, [key]: updatedValue }));
  }

  updateFlightQueryField(key: string, value: any): void {
    const updatedValue = (key === 'adults') ? Number(value) : value;
    this.flightQuery.update(q => ({ ...q, [key]: updatedValue }));
  }

  async submitFlightSearch(): Promise<void> {
    this.flightViewState.set({ loading: true, error: null, results: null });
    
    try {
      const { origin, destination, departureDate, returnDate, adults } = this.flightQuery();
      
      // 1. Get origin IATA code
      const originLocations = await this.flightService.searchLocations(origin);
      if (!originLocations || originLocations.length === 0) {
        throw new Error(`'${origin}' için havalimanı bulunamadı.`);
      }
      const originCode = originLocations[0].iataCode;

      // 2. Get destination IATA code
      const destLocations = await this.flightService.searchLocations(destination);
      if (!destLocations || destLocations.length === 0) {
        throw new Error(`'${destination}' için havalimanı bulunamadı.`);
      }
      const destCode = destLocations[0].iataCode;

      // 3. Search flights
      const results = await this.flightService.searchFlights({
        originLocationCode: originCode,
        destinationLocationCode: destCode,
        departureDate,
        returnDate: returnDate || undefined,
        adults
      });

      this.flightViewState.set({ loading: false, error: null, results });
    } catch (e: any) {
      this.flightViewState.set({ loading: false, error: e.message || 'Uçuş araması sırasında bir hata oluştu.', results: null });
    }
  }

  submitPlanRequest(): void {
    if (this.planningMode() === 'lucky') {
      this.submitLuckyDip();
    } else {
      this.submitDetailedPlanRequest();
    }
  }
  
  async submitDetailedPlanRequest(): Promise<void> {
    this.selectedCardId.set(null);
    this.viewState.set({ loading: true, error: null, response: null });
    try {
      const response = await this.geminiService.getTravelPlan(this.query());
      this.viewState.set({ loading: false, error: null, response });
    } catch (e: any) {
      this.viewState.set({ loading: false, error: e.message || 'Bir hata oluştu.', response: null });
    }
  }

  async submitLuckyDip(): Promise<void> {
    this.selectedCardId.set(null);
    this.viewState.set({ loading: true, error: null, response: null });

    try {
      const luckyDipSuggestion = await this.geminiService.generateLuckyDipSuggestion(this.query().departureCity);
      const luckyQuery: TravelQuery = {
        ...this.query(),
        destination: luckyDipSuggestion.destination,
        budget: luckyDipSuggestion.budget,
      };
      this.query.set(luckyQuery);
      const response = await this.geminiService.getTravelPlan(luckyQuery);
      this.viewState.set({ loading: false, error: null, response });
    } catch (e: any) {
      this.viewState.set({ loading: false, error: e.message || 'Şanslı bir plan oluşturulurken bir hata oluştu.', response: null });
    }
  }

  toggleCardDetails(cardId: number): void {
    this.selectedCardId.update(currentId => currentId === cardId ? null : cardId);
  }

  openHotelModal(card: InteractiveCard): void {
    if (card.alternative_hotels && card.alternative_hotels.length > 0) {
      this.modalContent.set({ title: card.title, hotels: card.alternative_hotels });
      this.isModalVisible.set(true);
      this.isModalAnimatingOut.set(false);
    }
  }
  
  closeHotelModal(): void {
    this.isModalAnimatingOut.set(true);
    setTimeout(() => {
        this.isModalVisible.set(false);
        this.modalContent.set(null);
        this.isModalAnimatingOut.set(false);
    }, 300);
  }

  // --- Helpers ---
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getFutureDateString(days: number): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
  }

  getBadgeColor(badge: string): string {
    const lowerBadge = badge.toLowerCase();
    if (lowerBadge.includes('ekonomik') || lowerBadge.includes('keşif')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-700';
    if (lowerBadge.includes('lüks') || lowerBadge.includes('konfor')) return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700';
    if (lowerBadge.includes('akıllı') || lowerBadge.includes('performans') || lowerBadge.includes('dengeli')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700';
    return 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600';
  }

  formatAssistantReply(reply: string): string {
    return reply ? reply.replace(/\n/g, '<br>') : '';
  }
}