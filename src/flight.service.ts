import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
}

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private http = inject(HttpClient);

  async searchLocations(keyword: string): Promise<any[]> {
    const params = new HttpParams().set('keyword', keyword);
    const response = await firstValueFrom(this.http.get<any>('/api/locations/search', { params }));
    return response || [];
  }

  async searchFlights(params: FlightSearchParams): Promise<any[]> {
    const response = await firstValueFrom(this.http.post<any>('/api/flights/search', params));
    return response || [];
  }
}
