import { UserProfile } from './services/profile';

export type FarmerProfile = UserProfile;

export enum AppView {
  Home = 'Home',
  Weather = 'Weather',
  CropDoctor = 'CropDoctor',
  MarketPrice = 'MarketPrice',
  Calculator = 'Calculator',
  SoilHealth = 'SoilHealth',
  GovSchemes = 'GovSchemes',
  Machinery = 'Machinery',
  Profile = 'Profile',
  CalendarTodo = 'CalendarTodo',
  AgriJobs = 'AgriJobs',
  Videos = 'Videos'
}
