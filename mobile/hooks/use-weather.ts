import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { apiRequest } from '@/lib/api';

interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation: number;
  weather_code: number;
  weather_icon: string;
  weather_desc: string;
}

interface WeatherData {
  location: string;
  current: {
    temp: number;
    icon: string;
    desc: string;
    precipitation_chance: number;
  };
  forecast: WeatherDay[];
}

export function useWeather() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      setLocError('Failed to get location');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, []);

  // Fetch weather data using location
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weather', location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location) return null;
      const res = await apiRequest('GET', `/api/weather?latitude=${location.latitude}&longitude=${location.longitude}`);
      if (!res.ok) throw new Error('Failed to fetch weather');
      return res.json() as Promise<WeatherData>;
    },
    enabled: !!location,
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  return {
    data,
    isLoading,
    locError,
    error: error || locError,
    refetch,
    requestLocation,
  };
}
