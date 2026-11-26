import type { SealedComponent } from './sealed-catalog';
import { BURSTS } from '../comic/bursts';
/**
 * Components that belong to this UI's catalog directly (no registration step). They are added to
 * the sealed list at render time, so a sealed component of the same name always wins.
 */
export const comicCatalogComponents: SealedComponent[] = [
  {
    name: 'Burst',
    category: 'feedback',
    description: 'A comic burst for one real backend event. Never shown without the event.',
    slots: [],
    props_schema: { type: 'object', properties: { event: { type: 'string', enum: Object.keys(BURSTS) } }, required: ['event'] }
  },
  {
    name: 'SpeechBalloon',
    category: 'content',
    description: "The identity's own voice in a speech balloon.",
    slots: [],
    props_schema: { type: 'object', properties: { text: { type: 'string' }, speaker: { type: ['string', 'null'] } }, required: ['text'] }
  },
  {
    name: 'ReceiptCard',
    category: 'content',
    description: 'A stamped receipt. Capability fields are stripped before rendering.',
    slots: [],
    props_schema: {
      type: 'object',
      properties: { receipt: { type: 'object', additionalProperties: true }, anchored: { type: ['boolean', 'null'] } },
      required: ['receipt']
    }
  }
];
export function withComicComponents(sealed: SealedComponent[]): SealedComponent[] {
  const have = new Set(sealed.map((c) => c.name));
  return [...sealed, ...comicCatalogComponents.filter((c) => !have.has(c.name))];
}
