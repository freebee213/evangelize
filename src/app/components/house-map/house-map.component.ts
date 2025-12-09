import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseService } from '../../services/house.service';
import { House } from '../../models/house.model';
import * as L from 'leaflet';
import 'leaflet-draw';
import { JumpToLocation, MapNavigationService } from '../../services/map-navigation.service';

@Component({
  selector: 'app-house-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex justify-content-center mb-2">
      <button class="btn btn-success" (click)="addCurrentLocation()">
        <i class="bi bi-geo-alt-fill"></i> Mark Current Location as Visited
      </button>
    </div>

    <!-- Map container -->
    <div id="map" style="height: 80vh;" class="border rounded shadow-sm fade show"></div>
  `,
})
export class HouseMapComponent implements OnInit, AfterViewInit {
  houses: House[] = [];
  map!: L.Map;
  markers: L.Marker[] = [];
  drawLayer!: L.FeatureGroup;

  constructor(private houseService: HouseService, private mapNav: MapNavigationService) {}

  ngOnInit() {
    this.houses = this.houseService.getHouses();
  }

  ngAfterViewInit() {
    this.initMap();

    // Subscribe to jump requests
    this.mapNav.jump$.subscribe((loc: JumpToLocation | null) => {
      if (loc) {
        // Map may not be ready yet, so use setTimeout to defer
        setTimeout(() => {
          if (this.map) {
            this.map.flyTo([loc.lat, loc.lng], loc.zoom || 16, { animate: true });
          }
          this.mapNav.clear();
        }, 100); // 100ms delay ensures map is initialized
      }
    });
  }

  initMap() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.createMapAtLocation(lat, lng, 16);
        },
        (error) => {
          console.warn('Geolocation failed, using default location.', error);
          this.createMapAtLocation(40.7128, -74.006, 13);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      this.createMapAtLocation(40.7128, -74.006, 13);
    }
  }

  createMapAtLocation(lat: number, lng: number, zoom: number) {
    // Create map only after location is known
    this.map = L.map('map').setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Initialize drawing layer
    this.drawLayer = new L.FeatureGroup();
    this.map.addLayer(this.drawLayer);

    // Load persistent markers and lines now that map exists
    this.loadMarkers();
    this.loadSavedLines();
    this.initDrawing();
  }

  loadMarkers() {
    this.houses.forEach(house => {
      const marker = L.marker([house.lat, house.lng], {
        icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
      }).addTo(this.map);

      marker.bindPopup(`<b>${house.street ?? 'Current Location'}</b><br>Visited`);
      this.markers.push(marker);
    });
  }

  addCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const visitedAt = new Date().toISOString(); // Save datetime

        const newHouse: House = {
          id: new Date().getTime(),
          visited: true,
          lat,
          lng,
          visitedAt
        };

        // Save house to service/localStorage
        this.houseService.addHouse(newHouse);
        this.houses.push(newHouse);

        // Add marker
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
        }).addTo(this.map);

        marker.bindPopup(`Current Location - Visited<br>${new Date(visitedAt).toLocaleString()}`);
        this.markers.push(marker);

        // Move and zoom map to the new marker
        this.map.flyTo([lat, lng], 16); // smooth pan and zoom
      },
      error => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Permission denied. Please allow location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            alert('The request to get your location timed out.');
            break;
          default:
            alert('Unable to get location: ' + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }


  initDrawing() {
    const drawControl = new L.Control.Draw({
      edit: { featureGroup: this.drawLayer, remove: true },
      draw: {
        polygon: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: {
          shapeOptions: {
            color: 'red',
            weight: 5,
            opacity: 0.8
          }
        }
      }
    });

    this.map.addControl(drawControl);

    // Event: New line drawn
    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawLayer.addLayer(layer);
      this.saveLines(); // Save after adding
    });

    // Event: Line edited
    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      this.saveLines();
    });

    // Event: Line deleted
    this.map.on(L.Draw.Event.DELETED, (e: any) => {
      this.saveLines();
    });
  }

  saveLines() {
    const geojson = this.drawLayer.toGeoJSON();
    localStorage.setItem('drawnLines', JSON.stringify(geojson));
  }

  loadSavedLines() {
    const saved = localStorage.getItem('drawnLines');
    if (saved) {
      const geojson = JSON.parse(saved);
      L.geoJSON(geojson, {
        style: {
          color: 'red',
          weight: 5,      // bold line
          opacity: 0.8
        }
      }).eachLayer((layer: any) => this.drawLayer.addLayer(layer));
    }
  }
}
