import SunCalc from 'suncalc';

/**
 * FRP PHYSICS TRIBUNAL v1.0
 * The False-Positive Guillotine. 
 * Discards the Grey Zone. Only flags Deterministic Impossibilities.
 */

export interface PhysicsEligibilityCheck {
  gps_lat: number;
  gps_lng: number;
  unix_timestamp: number; 
  iso: number;
  shutter_speed: string; 
  aperture: number;
}

// --- MATH HELPERS ---

function parseShutter(shutter: string): number {
  if (shutter.includes('/')) {
    const parts = shutter.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(shutter);
}

function computeEV(iso: number, shutterVal: number, aperture: number): number {
  // EV = log2(N^2 / t) + log2(ISO / 100)
  return Math.log2(Math.pow(aperture, 2) / shutterVal) + Math.log2(iso / 100);
}

function computeExpectedEV(altitudeRadians: number): number {
  const altitudeDegrees = altitudeRadians * (180 / Math.PI);
  if (altitudeDegrees < -6) return 2; // Night/Civil Twilight
  if (altitudeDegrees < 10) return 11; // Sunrise/Sunset
  if (altitudeDegrees < 30) return 13; // Low Sun
  return 15; // High Sun (Clear Sky)
}

// --- GATE 1: METADATA COMPLETENESS ---

function gate1_completeness(meta: Partial<PhysicsEligibilityCheck>): boolean {
  if (meta.gps_lat === undefined || meta.gps_lng === undefined) return false;
  
  // Null Island Trap (Spoofer hardware failure)
  if (Math.abs(meta.gps_lat) < 0.001 && Math.abs(meta.gps_lng) < 0.001) return false; 
  
  if (!meta.unix_timestamp) return false;
  
  // Age check: Must be within the last 30 days (2,592,000 seconds)
  const age = (Date.now() / 1000) - meta.unix_timestamp;
  if (age < 0 || age > 2592000) return false; 
  
  if (!meta.iso || meta.iso < 50 || meta.iso > 102400) return false;
  if (!meta.shutter_speed || isNaN(parseShutter(meta.shutter_speed))) return false;
  if (!meta.aperture || meta.aperture < 0.95 || meta.aperture > 32) return false;
  
  return true;
}

// --- GATE 2: ENVIRONMENT CLASSIFIER (THE GREY ZONE) ---

type EnvironmentVerdict = 'CLEAR_OUTDOOR' | 'OVERCAST' | 'TUNNEL_UNDERPASS' | 'NIGHT' | 'DISCARD';

function gate2_environment(meta: PhysicsEligibilityCheck, sunPos: any, ev: number): EnvironmentVerdict {
  // NIGHT CHECK: Sun altitude below -6° (civil twilight)
  if (sunPos.altitude < -0.1047) return 'NIGHT'; 
  
  // TUNNEL CHECK: High sun (>20°) but EV is extremely low (< 6)
  if (sunPos.altitude > 0.349 && ev < 6) return 'TUNNEL_UNDERPASS';
  
  // OVERCAST BOUNDARY: Allow 4-stop variance from clear sky model
  const expectedEV = computeExpectedEV(sunPos.altitude);
  const evDelta = Math.abs(ev - expectedEV);
  
  if (evDelta > 4.0 && evDelta <= 6.0) return 'OVERCAST'; 
  if (evDelta > 6.0) return 'DISCARD'; // Too much variance, cannot trust the baseline. Discard.
  
  return 'CLEAR_OUTDOOR';
}

// --- GATE 3: THE PHYSICS TRIBUNAL ---

export function executeTribunal(meta: Partial<PhysicsEligibilityCheck>) {
  // GATE 1
  if (!gate1_completeness(meta)) {
    return { status: 'DISCARDED', reason: 'GATE_1_FAILED_METADATA' };
  }

  const validMeta = meta as PhysicsEligibilityCheck;
  const date = new Date(validMeta.unix_timestamp * 1000);
  const sunPos = SunCalc.getPosition(date, validMeta.gps_lat, validMeta.gps_lng);
  const shutterVal = parseShutter(validMeta.shutter_speed);
  const ev = computeEV(validMeta.iso, shutterVal, validMeta.aperture);

  // GATE 2
  const envVerdict = gate2_environment(validMeta, sunPos, ev);
  if (envVerdict === 'DISCARD' || envVerdict === 'TUNNEL_UNDERPASS' || envVerdict === 'NIGHT') {
    return { status: 'DISCARDED', reason: `GATE_2_ENVIRONMENT_${envVerdict}` };
  }

  // GATE 3: 5-AXIS DEVIATION SCORE
  const expectedEV = computeExpectedEV(sunPos.altitude);
  
  // Axis 1: EV vs Solar Irradiance (Impossible Gap)
  const axis1Violation = (ev - expectedEV) > 5.0; 
  
  // Axis 2: ISO vs Time of Day (High Sun, but ISO > 6400)
  const axis2Violation = sunPos.altitude > 0.785 && validMeta.iso > 6400;
  
  // Axis 3: Shutter Speed vs Motion Context (Daylight dashcam at 1/30s is impossible without blur)
  const axis3Violation = shutterVal < (1/100) && ev > 12;
  
  // Axis 4: GPS Latitude vs Solar Altitude (Spoofed GPS)
  const maxPossibleAltitude = 90 - Math.abs(validMeta.gps_lat) + 23.5;
  const axis4Violation = (sunPos.altitude * (180 / Math.PI)) > (maxPossibleAltitude + 5);
  
  // Axis 5: Internal Exposure Triangle Consistency
  const triangleConstant = validMeta.iso * shutterVal * (1 / Math.pow(validMeta.aperture, 2));
  const expectedConstant = Math.pow(2, ev) * 100; // Reverse EV
  const axis5Violation = Math.abs(Math.log2(triangleConstant / expectedConstant)) > 2.0;

  const violations =[axis1Violation, axis2Violation, axis3Violation, axis4Violation, axis5Violation].filter(Boolean).length;

  if (violations >= 3) {
    return {
      status: 'PHYSICAL_LIE',
      confidence: violations / 5,
      metrics: { ev, expectedEV, sunAltitude: sunPos.altitude * (180 / Math.PI), violations }
    };
  }

  return { status: 'AUTHENTIC', confidence: 1.0 };
}
