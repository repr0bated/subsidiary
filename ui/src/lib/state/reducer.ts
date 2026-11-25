/**
 * One feed per plugin, from StateSync frames (FUSEFS.md §12.3, design §4).
 * - Newest `state_generation` per object path wins; older frames are ignored.
 * - A tombstone removes the path and its subtree and blocks older frames for that subtree.
 * - Withheld state is simply absent; nothing is synthesized.
 * - Values are complete views of their path: replaced, never patched.
 * - On data_loss, disconnect or a new catalog_hash the caller resets and hydrates again.
 */

export type FrameKind = 'initial' | 'update' | 'heartbeat';

export interface Frame {
  plugin_id: string;
  object_path: string;
  kind: FrameKind;
  /** true for OBJECT_REMOVED / PROPERTY_DELETE / no new_value */
  tombstone?: boolean;
  /** true for a SCHEMA_MIGRATION frame */
  schema?: boolean;
  value?: unknown;
  schema_hash?: string;
  catalog_hash: string;
  state_generation: bigint;
}

export interface PathValue {
  value: unknown;
  generation: bigint;
  schemaHash: string;
}

export interface PluginFeed {
  schema?: unknown;
  schemaHash: string;
  removed: boolean;
  paths: ReadonlyMap<string, PathValue>;
}

export interface FeedState {
  catalogHash: string;
  generation: bigint;
  plugins: ReadonlyMap<string, PluginFeed>;
}

export const emptyFeedState = (): FeedState => ({ catalogHash: '', generation: 0n, plugins: new Map() });

const within = (path: string, root: string) => path === root || path.startsWith(root.endsWith('/') ? root : root + '/');

export class FeedReducer {
  private seen = new Map<string, bigint>(); // `${plugin}\0${path}` -> highest generation applied
  private tombstones = new Map<string, { plugin: string; path: string; generation: bigint }>();
  private s: FeedState = emptyFeedState();

  get state(): FeedState {
    return this.s;
  }

  /** Discard everything (before re-hydration). */
  reset(): FeedState {
    this.seen.clear();
    this.tombstones.clear();
    this.s = emptyFeedState();
    return this.s;
  }

  apply(f: Frame): FeedState {
    if (f.state_generation > this.s.generation) {
      this.s = { ...this.s, generation: f.state_generation, catalogHash: f.catalog_hash };
    }
    if (f.kind === 'heartbeat') return this.s;

    const key = `${f.plugin_id}\0${f.schema ? '#schema' : f.object_path}`;
    const last = this.seen.get(key);
    if (last !== undefined && f.state_generation < last) return this.s;

    const prev = this.s.plugins.get(f.plugin_id) ?? { schemaHash: '', removed: false, paths: new Map<string, PathValue>() };
    const feed: PluginFeed = { ...prev, paths: new Map(prev.paths) };
    const paths = feed.paths as Map<string, PathValue>;

    if (f.schema) {
      this.seen.set(key, f.state_generation);
      feed.schema = f.value;
      feed.schemaHash = f.schema_hash ?? '';
      feed.removed = f.value === undefined;
      if (feed.removed) paths.clear();
    } else {
      for (const t of this.tombstones.values()) {
        if (t.plugin === f.plugin_id && within(f.object_path, t.path) && f.state_generation <= t.generation && !f.tombstone) {
          return this.s;
        }
      }
      this.seen.set(key, f.state_generation);
      if (f.tombstone || f.value === undefined) {
        this.tombstones.set(`${f.plugin_id}\0${f.object_path}`, { plugin: f.plugin_id, path: f.object_path, generation: f.state_generation });
        for (const p of [...paths.keys()]) if (within(p, f.object_path)) paths.delete(p);
      } else {
        paths.set(f.object_path, { value: f.value, generation: f.state_generation, schemaHash: f.schema_hash ?? '' });
      }
    }

    const plugins = new Map(this.s.plugins);
    plugins.set(f.plugin_id, feed);
    this.s = { ...this.s, plugins };
    return this.s;
  }
}

/** Read-only view of the feeds for the json-render state store, under /plugins/<plugin_id>. */
export function toStateTree(state: FeedState): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, feed] of state.plugins) {
    const values: Record<string, unknown> = {};
    for (const [path, pv] of feed.paths) values[path] = pv.value;
    out[id] = Object.freeze(values);
  }
  return Object.freeze(out);
}
