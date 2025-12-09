import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { House } from '../../models/house.model';
import { HouseService } from '../../services/house.service';
import { Router } from '@angular/router';
import { MapNavigationService } from '../../services/map-navigation.service';

@Component({
  selector: 'app-house-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './house-list.component.html',
  styleUrls: ['./house-list.component.css']
})
export class HouseListComponent implements OnInit {
  houses: House[] = [];

  constructor(
    private houseService: HouseService,
    private router: Router,
    private mapNav: MapNavigationService) {}

  ngOnInit() {
    this.houses = this.houseService.getHouses();
  }

  updateHouse(house: House) {
    this.houseService.updateHouse(house);
  }

  deleteMarker(id: number) {
    if (confirm('Are you sure you want to delete this marker?')) {
      this.houseService.deleteHouse(id);
      this.houses = this.houseService.getHouses();
    }
  }

  jumpToMarker(house: House) {
    this.mapNav.jumpTo({ lat: house.lat, lng: house.lng, zoom: 16 });
    this.router.navigate(['/map']);
  }
}
