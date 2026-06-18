export interface DriverProfile {
  id: number;
  userId: number;
  state: string;
  seatsAvailable: number;
  fromLocation?: string;
  toLocation?: string;
  features: string[];
  lastActive: Date;
}

export interface ClientRequest {
  id: number;
  userId: number;
  seats: number;
  fromLocation?: string;
  toLocation?: string;
  features: string[];
  time?: string;
  status: string;
  createdAt: Date;
}

export interface MatchResult {
  driverId: number;
  requestId: number;
  score: number;
  reasons: string[];
}
