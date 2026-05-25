export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type NormalizedLinkedUser = {
  id: string;
  displayName: string;
  subtitle: string;
  email: string;
  role: string;
  trackingEnabled: boolean;
  coordinate: Coordinate | null;
};

export type NormalizedSafeZone = {
  id: string;
  dependentId: string | null;
  name: string;
  radius: number;
  latitude: number;
  longitude: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

export function normalizeCoordinate(input: unknown): Coordinate | null {
  const record = toRecord(input);
  if (!record) return null;
  const lat = toNumber(record.latitude ?? record.lat);
  const lng = toNumber(record.longitude ?? record.lng);
  if (lat === null || lng === null) return null;
  return { latitude: lat, longitude: lng };
}

export function normalizeLinkedChildren(input: unknown): NormalizedLinkedUser[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;
      const rawId = record.id ?? record.child_id ?? record.user_id;
      if (rawId === null || rawId === undefined) return null;

      const id = String(rawId);
      const email = typeof record.email === 'string' ? record.email.trim() : '';
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const role = typeof record.role === 'string' ? record.role.trim() : 'child';
      const trackingEnabled = Boolean(record.tracking_enabled ?? record.trackingEnabled);
      const coordinate = normalizeCoordinate(record);

      return {
        id,
        displayName: name || email || `User ${id}`,
        subtitle: `${email || `ID: ${id}`} - ${role || 'user'} - Tracking ${
          trackingEnabled ? 'ON' : 'OFF'
        }`,
        email,
        role,
        trackingEnabled,
        coordinate,
      } satisfies NormalizedLinkedUser;
    })
    .filter((item): item is NormalizedLinkedUser => Boolean(item));
}

export function normalizeSafeZones(input: unknown): NormalizedSafeZone[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      const record = toRecord(item);
      if (!record) return null;
      const coordinate = normalizeCoordinate(record);
      if (!coordinate) return null;

      const radius = toNumber(record.radius ?? record.radius_meters ?? record.radiusMeters) ?? 100;
      const id = String(record.id ?? record.zone_id ?? `${coordinate.latitude}-${coordinate.longitude}-${index}`);
      const name =
        (typeof record.zone_name === 'string' && record.zone_name.trim()) ||
        (typeof record.name === 'string' && record.name.trim()) ||
        'Safe Zone';
      const dependentIdRaw = record.dependent_id ?? record.child_id ?? null;

      return {
        id,
        dependentId: dependentIdRaw === null || dependentIdRaw === undefined ? null : String(dependentIdRaw),
        name,
        radius,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      } satisfies NormalizedSafeZone;
    })
    .filter((item): item is NormalizedSafeZone => Boolean(item));
}

export function normalizeChildLocation(input: unknown): Coordinate | null {
  const coordinate = normalizeCoordinate(input);
  if (!coordinate) return null;
  if (coordinate.latitude === 0 && coordinate.longitude === 0) return null;
  return coordinate;
}
