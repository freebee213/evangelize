import { Routes } from '@angular/router';
import { HouseMapComponent } from './components/house-map/house-map.component';
import { HouseListComponent } from './components/house-list/house-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' }, // default to map
  { path: 'map', component: HouseMapComponent },
  { path: 'list', component: HouseListComponent },
];
