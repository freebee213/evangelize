import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface JumpToLocation {
  lat: number;
  lng: number;
  zoom?: number;
}

@Injectable({ providedIn: 'root' })
export class MapNavigationService {
  private jumpSubject = new BehaviorSubject<JumpToLocation | null>(null);
  jump$ = this.jumpSubject.asObservable();

  jumpTo(location: JumpToLocation) {
    this.jumpSubject.next(location);
  }

  clear() {
    this.jumpSubject.next(null);
  }
}
