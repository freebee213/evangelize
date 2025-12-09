export interface House {
  id: number;
  street?: string;
  number?: string;
  visited: boolean;
  lat: number;
  lng: number;
  visitedAt?: string; // ISO string datetime
}
