import { useState, useCallback } from 'react';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GPSError {
  code: number;
  message: string;
}

export function useGPS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GPSError | null>(null);
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<GPSCoordinates | null> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        const gpsError: GPSError = {
          code: 0,
          message: 'Geolocation is not supported by your browser'
        };
        setError(gpsError);
        setLoading(false);
        resolve(null);
        return;
      }

      // Request location with high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GPSCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setCoordinates(coords);
          setError(null);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'Failed to get location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permission denied. Please enable location access in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your GPS/network.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }

          const gpsError: GPSError = {
            code: err.code,
            message: errorMessage,
          };
          setError(gpsError);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000, // 30 seconds
          maximumAge: 0, // Don't cache, always get fresh position
        }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setCoordinates(null);
    setError(null);
  }, []);

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      // Haversine formula to calculate distance between two coordinates in meters
      const R = 6371000; // Earth's radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  const isWithinRadius = useCallback(
    (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
      radiusMeters: number
    ): boolean => {
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      return distance <= radiusMeters;
    },
    [calculateDistance]
  );

  return {
    loading,
    error,
    coordinates,
    getCurrentLocation,
    clearLocation,
    calculateDistance,
    isWithinRadius,
  };
}
