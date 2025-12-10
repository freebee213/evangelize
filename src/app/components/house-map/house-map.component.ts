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
    <div class="row">
      <div class="col">
        <div class="d-flex justify-content-center mb-2">
          <button class="btn btn-success" (click)="addCurrentLocation()">
            <i class="bi bi-geo-alt-fill"></i> Mark Current Location as Visited
          </button>
        </div>
      </div>
      <div class="col">
        <div class="d-flex justify-content-center mb-2">
          <button class="btn btn-primary" (click)="startPlacingMarker()">
            <i class="bi bi-pin-map-fill"></i> Place Visited Marker Manually
          </button>
        </div>
      </div>
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
  isPlacingMarker = false;
  polylineLayer!: L.Polyline; // persistent reference

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
    try {
      if (!navigator.geolocation) {
        return alert('Geolocation not supported by browser');
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.createMapAtLocation(pos.coords.latitude, pos.coords.longitude, 16);
        },
        (err) => {
          console.log(err)
          alert(err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } catch (err) {
      console.warn('Could not get location, falling back to default. Error:', err);
      // fallback location (NYC or pick your preferred default)
      this.createMapAtLocation(40.7128, -74.006, 13);
    }
  }

  startPlacingMarker() {
    this.isPlacingMarker = true;
    let acknowledged = sessionStorage.getItem("acknowledgedManualPlacementInfo");
    if (acknowledged === "true")
      return;

    alert('Tap on the map where the visit occurred.');
    sessionStorage.setItem("acknowledgedManualPlacementInfo", "true");
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

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.isPlacingMarker) return;

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const visitedAt = new Date().toISOString();

      // Build new house object
      const newHouse: House = {
        id: new Date().getTime(),
        visited: true,
        lat,
        lng,
        visitedAt,
        street: 'Manually Placed'
      };

      // Save to persistent storage
      this.houseService.addHouse(newHouse);
      this.houses.push(newHouse);

      // Create marker
      const marker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(this.map);

      marker.bindPopup(
        `<b>Manually Added Visit</b><br>${new Date(visitedAt).toLocaleString()}`
      );

      this.markers.push(marker);

      // Stop placement mode
      this.isPlacingMarker = false;
    });


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

  async addCurrentLocation() {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const visitedAt = new Date().toISOString();

          const newHouse: House = {
            id: Date.now(),
            visited: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            visitedAt
          };

          // save
          this.houseService.addHouse(newHouse);
          this.houses.push(newHouse);

          // add marker (use your existing icon config)
          const marker = L.marker([pos.coords.latitude, pos.coords.longitude], {
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

          // move map
          if (this.map) this.map.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
        },
        (err) => {
          console.log(err)
          alert(err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } catch (err: any) {
      console.error('addCurrentLocation error:', err);
      // Provide helpful messages
      if (err && (err.code === 1 || /permission/i.test(err.message || ''))) {
        alert('Location permission denied. Please enable location access in your browser or device settings.');
      } else if (err && err.code === 2) {
        alert('Location information is unavailable. Try moving to an area with better GPS/Wi-Fi signal.');
      } else {
        alert('Unable to get location: ' + (err.message || err));
      }
    }
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

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      if (e.layerType === 'polyline') {
        const layer = e.layer;

        // Append points to existing polyline if exists
        if (!this.polylineLayer) {
          this.polylineLayer = layer;
          this.drawLayer.addLayer(layer);
        } else {
          const newLatLngs = layer.getLatLngs();
          const existing = this.polylineLayer.getLatLngs() as L.LatLng[];
          this.polylineLayer.setLatLngs(existing.concat(newLatLngs));
        }

        this.saveLines();
      }
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => this.saveLines());
    this.map.on(L.Draw.Event.DELETED, (e: any) => this.saveLines());
  }

  saveLines() {
    const geojson = this.drawLayer.toGeoJSON();
    localStorage.setItem('drawnLines', JSON.stringify(geojson));
  }

  loadSavedLines() {
    const saved = localStorage.getItem('drawnLines');
    if (saved) {
      const geojson = JSON.parse(saved);
      this.polylineLayer = L.geoJSON(geojson, {
        style: { color: 'red', weight: 5, opacity: 0.8 }
      }).eachLayer((layer: any) => this.drawLayer.addLayer(layer)) as any;
    }
  }
}
