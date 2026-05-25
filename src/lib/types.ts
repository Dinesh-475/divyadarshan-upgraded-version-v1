export type Language = 'English' | 'Kannada' | 'Hindi' | 'Tamil' | 'Telugu';
export type BudgetTier = 'Budget' | 'Mid-range' | 'Premium' | 'Luxury';
export type TravelMode = 'Car' | 'Bus' | 'Train' | 'Flight';
export type TimePreference = 'Morning' | 'Afternoon' | 'Evening';
export type FoodPreference = 'Vegetarian' | 'Jain' | 'South Indian meals' | 'No onion/garlic';
export type CrowdPreference = 'Least crowded' | 'Festival timings' | 'Peak spiritual hours';

export type PlanFormState = {
  temple: string;
  date: string; // yyyy-mm-dd
  pilgrims: number;
  budget: BudgetTier;
  travelMode: TravelMode;
  timePreference: TimePreference;
  nights: number;
  startLocation: string;
  useLiveLocation: boolean;
  extraStops: string;
  foodPreference: FoodPreference;
  elderlyFriendly: boolean;
  wheelchairAccessible: boolean;
  childFriendly: boolean;
  vipDarshan: boolean;
  crowdPreference: CrowdPreference;
  weatherAware: boolean;
  festivalAware: boolean;
};

export type ItineraryItem = {
  day: number;
  time: string;
  title: string;
  detail: string;
  durationMins?: number;
  tag?: 'darshan' | 'travel' | 'food' | 'stay' | 'spiritual' | 'safety';
};

export type MoneyBreakdown = {
  total: number;
  perPerson: number;
  fuel: number;
  stay: number;
  food: number;
  tolls: number;
  localTransport: number;
  hidden: number;
  surgeAlert?: string | null;
  savings: string[];
  savingIdeas?: {
    title: string;
    detail: string;
    saveAmount: number;
  }[];
};

export type GeneratedPlan = {
  id: string;
  createdAt: number;
  templeName?: string;
  summary: string;
  route: {
    distanceKm: number;
    durationText: string;
    fuelEstimate: number;
    tollEstimate: number;
    fastest: string;
    scenic: string;
    evStops: string[];
    restaurants: string[];
    safety: 'Low risk' | 'Moderate' | 'High attention';
  };
  money: MoneyBreakdown;
  itinerary: ItineraryItem[];
  devotee: {
    queueEstimate: string;
    timings: string[];
    festivalAlerts: string[];
    auspicious: string[];
    historyCards: { title: string; body: string }[];
    chants: string[];
    prasadam: string[];
  };
  stays: {
    category: 'Dharmashala' | 'Family rooms' | 'Budget' | 'Premium';
    name: string;
    walkingMins: number;
    seniorFriendly: boolean;
    cleanliness: 'Excellent' | 'Very good' | 'Good';
    earlyCheckin: boolean;
    rating: number;
    photoUrl: string;
    recommendation: string;
    priceHint: string;
    bookingUrl?: string;
  }[];
};

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};
