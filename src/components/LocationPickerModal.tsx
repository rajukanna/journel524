import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  X, 
  Check, 
  Compass, 
  ExternalLink, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { JournalLocation } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: JournalLocation;
  onSaveLocation: (location: JournalLocation | null) => void;
}

const PRESET_PLACES: Array<{ name: string; tag: string; lat: number; lng: number }> = [
  { name: 'Kyoto, Japan', tag: 'Tranquil Temples', lat: 35.0116, lng: 135.7681 },
  { name: 'Central Park, New York', tag: 'Urban Oasis', lat: 40.785091, lng: -73.968285 },
  { name: 'Paris, France', tag: 'Café Reflections', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo, Japan', tag: 'Mindful Sanctuary', lat: 35.6762, lng: 139.6503 },
  { name: 'San Francisco, CA', tag: 'Pacific Coast', lat: 37.7749, lng: -122.4194 },
  { name: 'London, UK', tag: 'Historic Parks', lat: 51.5074, lng: -0.1278 },
  { name: 'Bali, Indonesia', tag: 'Verdant Retreat', lat: -8.3405, lng: 115.0920 },
  { name: 'Zion National Park, UT', tag: 'Canyon Silence', lat: 37.2982, lng: -113.0263 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSaveLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<JournalLocation | null>(currentLocation || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Search geocode API proxy
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/maps/geocode?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (data.success && data.data) {
        setSelectedLocation({
          name: data.data.name,
          address: data.data.address,
          lat: data.data.lat,
          lng: data.data.lng,
          placeId: data.data.placeId
        });
      } else {
        setErrorMessage(data.error || 'Could not find that location. Please try another place.');
      }
    } catch (err: any) {
      console.error('Geocoding error:', err);
      setErrorMessage('Network error resolving location. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (data.success && data.data) {
            setSelectedLocation({
              name: data.data.name,
              address: data.data.address,
              lat: latitude,
              lng: longitude
            });
          } else {
            setSelectedLocation({
              name: 'Current Coordinates',
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              lat: latitude,
              lng: longitude
            });
          }
        } catch {
          setSelectedLocation({
            name: 'Current Location',
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation failed or permission denied:', err);
        setErrorMessage('Location permission denied or unavailable. You can search manually above.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSelectPreset = (preset: typeof PRESET_PLACES[0]) => {
    setSelectedLocation({
      name: preset.name,
      address: `${preset.name} (${preset.tag})`,
      lat: preset.lat,
      lng: preset.lng
    });
    setErrorMessage(null);
  };

  const handleSave = () => {
    onSaveLocation(selectedLocation);
    onClose();
  };

  const handleRemove = () => {
    onSaveLocation(null);
    onClose();
  };

  return (
    <div 
      id="modal-location-picker" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Pin Location to Entry</h3>
              <p className="text-xs text-slate-500">Anchor this journal reflection to a meaningful place</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-location-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, landmark, or address..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              id="btn-location-search"
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Quick Action: Device Geolocation */}
          <button
            id="btn-device-geolocation"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Navigation className="w-4 h-4 text-blue-600" />
            )}
            <span>{isLocating ? 'Detecting coordinates...' : 'Use Current Device Location'}</span>
          </button>

          {/* Error notice */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected Location Card */}
          {selectedLocation && (
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                      Selected Location
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{selectedLocation.name}</h4>
                    {selectedLocation.address && (
                      <p className="text-xs text-slate-600 mt-0.5">{selectedLocation.address}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      Coordinates: {selectedLocation.lat.toFixed(4)}°, {selectedLocation.lng.toFixed(4)}°
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocation.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white/80 hover:bg-white px-2 py-1 rounded-md border border-blue-200 transition-colors"
                  title="Open in Google Maps"
                >
                  <span className="hidden sm:inline">Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Interactive Google Maps Embed */}
              <div className="mt-3 overflow-hidden rounded-lg border border-blue-200/80 shadow-2xs bg-slate-100">
                <iframe
                  title={`Google Map - ${selectedLocation.name}`}
                  width="100%"
                  height="160"
                  className="w-full border-0 block"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}&z=14&output=embed`}
                />
              </div>
            </div>
          )}

          {/* Presets Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                Serene Writing Havens
              </span>
              <span className="text-[11px] text-slate-400">Quick Inspiration</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PLACES.map((preset) => {
                const isSelected = selectedLocation?.name === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-medium shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-medium text-slate-900 truncate">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{preset.tag}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            {currentLocation && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Remove Pin
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-location"
              type="button"
              onClick={handleSave}
              disabled={!selectedLocation}
              className="px-4 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pin to Entry</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
