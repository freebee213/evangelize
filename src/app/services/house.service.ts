import { Injectable } from '@angular/core';
import { House } from '../models/house.model';

@Injectable({ providedIn: 'root' })
export class HouseService {
  private storageKey = 'houses';

  getHouses(): House[] {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }

  addHouse(house: House) {
    const houses = this.getHouses();
    houses.push(house);
    localStorage.setItem(this.storageKey, JSON.stringify(houses));
  }

  updateHouse(updatedHouse: House) {
    const houses = this.getHouses().map(h => h.id === updatedHouse.id ? updatedHouse : h);
    localStorage.setItem(this.storageKey, JSON.stringify(houses));
  }

  deleteHouse(id: number) {
    const houses = this.getHouses().filter(h => h.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(houses));
  }
}
