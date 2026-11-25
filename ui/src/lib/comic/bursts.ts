/** One burst per real backend event (requirement 8.2). A burst never fakes an event. */
export type BackendEvent =
  | 'call_written'
  | 'receipt_returned'
  | 'contract_accepted'
  | 'head_anchored'
  | 'receipt_verified'
  | 'candidate_registered'
  | 'host_refused';

export const BURSTS: Record<BackendEvent, { word: string; label: string; color: 'red' | 'yellow' | 'blue' }> = {
  call_written: { word: 'ZAP!', label: 'Call sent', color: 'blue' },
  receipt_returned: { word: 'KA-CHUNK!', label: 'Receipt returned', color: 'yellow' },
  contract_accepted: { word: 'CHING!', label: 'Contract accepted', color: 'yellow' },
  head_anchored: { word: 'POW!', label: 'Anchored on the public record', color: 'red' },
  receipt_verified: { word: 'BAM!', label: 'Receipt verified against the public record', color: 'red' },
  candidate_registered: { word: 'ZING!', label: 'New component registered for review', color: 'blue' },
  host_refused: { word: 'BONK!', label: 'The host refused the call', color: 'red' }
};

export function burstFor(event: BackendEvent) {
  return BURSTS[event];
}
