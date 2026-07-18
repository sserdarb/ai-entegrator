export interface TravelQuery {
  departureCity: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  pax: number;
  budget: number;
}

export interface BudgetAnalysis {
  original_cost: number;
  user_budget: number;
  gap: number;
}

export interface FlightDetails {
  airline: string;
  departureTime: string;
  returnTime: string;
  type: 'direct' | 'connecting';
  pricePerPerson: number;
  duration: string;
}

export interface HotelDetails {
  name: string;
  rating: number;
  location: 'Merkez' | 'Metroya Yakın' | 'Havaalanı Yakını' | 'Sakin Bölge';
  pricePerNight: number;
  style: 'Lüks' | 'Butik' | 'Ekonomik' | 'İş';
  description: string;
  amenities: string[];
}

export interface InteractiveCard {
  id: number;
  badge: string;
  title: string;
  details_summary: string;
  total_price: number;
  why_this_option: string;
  flight_details?: FlightDetails;
  primary_hotel?: HotelDetails;
  alternative_hotels?: HotelDetails[];
}

export interface TravelPlanResponse {
  assistant_reply: string;
  status: 'success' | 'negotiation_needed';
  budget_analysis: BudgetAnalysis;
  interactive_cards: InteractiveCard[];
}

export interface FlightOffer {
  airline: string;
  departureTime: string;
  returnTime: string;
  pricePerPerson: number;
  type: 'direct' | 'connecting';
  duration: string;
}

export interface HotelOffer {
  name: string;
  rating: number;
  location: 'Merkez' | 'Metroya Yakın' | 'Havaalanı Yakını' | 'Sakin Bölge';
  pricePerNight: number;
  style: 'Lüks' | 'Butik' | 'Ekonomik' | 'İş';
  description: string;
  amenities: string[];
}

export interface AmadeusData {
  flightOffers: FlightOffer[];
  hotelOffers: HotelOffer[];
}