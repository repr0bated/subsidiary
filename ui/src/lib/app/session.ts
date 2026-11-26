import { FeedReducer, type FeedState, type Frame } from '../state/reducer';
import type { SealedComponent } from '../catalog/sealed-catalog';
import type { Door, Receipt } from '../door/types';

/**
 * One browser session against the door (design §3, §4, §5). No polling, no timers:
 * - sealed components from `json_render.list_components`, reloaded when a frame reports a new
 *   catalog_hash; schema arrives in the Subscribe stream, so nothing waits for `fuse.get_catalog`;
 * - state from the Subscribe stream into one reducer; data_loss, disconnect or a catalog
 *   change resets it and hydrates again;
 * - a chat turn's commit is awaited by re-reading the turn only when a chat_response frame arrives.
 */

export type Subscribe = (pluginIds: string[], signal?: AbortSignal) => AsyncIterable<Frame>;

export type SessionStatus = 'disconnected' | 'connecting' | 'live' | 'stopped' | 'error';

function inner(r: Receipt): Record<string, unknown> {
  const x = (r.result ?? {}) as Record<string, unknown>;
  return (x.result as Record<string, unknown>) ?? x;
}

/** Terminal feed conditions stop the feed; only these are retried (plugin-feeds.md). */
export function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  return code === 'UNAVAILABLE' || code === 'DEADLINE_EXCEEDED' || /expired/i.test((error as Error)?.message ?? '');
}

export class Session {
  /** The catalog hash the current feed was hydrated from, taken from its first frame. */
  catalogHash = '';
  components: SealedComponent[] = [];
  status: SessionStatus = 'disconnected';
  private reducer = new FeedReducer();
  private listeners = new Set<(s: FeedState) => void>();
  private chatWaiters = new Set<() => void>();

  constructor(
    private door: Door,
    private subscribeFeed: Subscribe
  ) {}

  get feeds(): FeedState {
    return this.reducer.state;
  }

  onFeeds(fn: (s: FeedState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  call(plugin: string, method: string, args: unknown = {}): Promise<Receipt> {
    return this.door.callMethod(plugin, method, args);
  }

  async loadComponents(): Promise<void> {
    const listed = inner(await this.call('json_render', 'list_components', {}));
    this.components = Array.isArray(listed.components) ? (listed.components as SealedComponent[]) : [];
  }

  /** Subscribe and apply frames. Re-hydrates only on a catalog change, DATA_LOSS or a retryable
   * transport error; a stream the server ends cleanly, or any terminal error, stops the feed. */
  async run(signal?: AbortSignal): Promise<void> {
    this.status = 'connecting';
    for (;;) {
      this.reducer.reset();
      let again = false;
      try {
        await this.loadComponents();
        this.catalogHash = '';
        for await (const f of this.subscribeFeed([], signal)) {
          if (signal?.aborted) break;
          this.status = 'live';
          const s = this.reducer.apply(f);
          if (f.plugin_id === 'chat_response' && f.kind !== 'heartbeat') for (const w of [...this.chatWaiters]) w();
          for (const l of this.listeners) l(s);
          if (f.catalog_hash && !this.catalogHash) this.catalogHash = f.catalog_hash;
          else if (f.catalog_hash && f.catalog_hash !== this.catalogHash) {
            again = true; // catalog changed: reload and hydrate again
            break;
          }
        }
      } catch (e) {
        if (!signal?.aborted) {
          const code = (e as { code?: string })?.code;
          again = code === 'DATA_LOSS' || isRetryable(e);
          if (!again) this.status = 'error';
        }
      }
      if (!again || signal?.aborted) break;
    }
    if (this.status !== 'error') this.status = 'stopped';
  }

  /** Resolves when the response turn is committed. Driven by chat_response frames, never a timer. */
  waitForCommit = async (responseTurnId: string, signal?: AbortSignal): Promise<void> => {
    const committed = async () => {
      const turn = inner(await this.call('chat_response', 'get_turn_response', { turn_id: responseTurnId })).turn as
        | { content?: unknown }
        | null
        | undefined;
      return !!turn?.content;
    };
    if (await committed()) return;
    await new Promise<void>((resolve, reject) => {
      let busy = false;
      const wake = async () => {
        if (busy) return;
        busy = true;
        try {
          if (await committed()) {
            this.chatWaiters.delete(wake);
            resolve();
          }
        } catch (e) {
          this.chatWaiters.delete(wake);
          reject(e);
        } finally {
          busy = false;
        }
      };
      this.chatWaiters.add(wake);
      signal?.addEventListener('abort', () => {
        this.chatWaiters.delete(wake);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  };

  // ---- conversation ----
  private conversationId: Promise<string> | null = null;
  /** This container's conversation: the most recent one it already has, else a new one the bridge
   * mints. Asked for on the first message, so opening the page creates nothing. */
  conversation(): Promise<string> {
    this.conversationId ??= (async () => {
      const listed = inner(await this.call('chat_response', 'list_conversations', {}));
      const latest = (listed.conversations as { conversation_id?: string }[] | undefined)?.[0]?.conversation_id;
      if (latest) return latest;
      const started = inner(await this.call('chat_response', 'start_conversation', {}));
      const id = String(started.conversation_id ?? '');
      if (!id) throw new Error('start_conversation returned no conversation_id');
      return id;
    })();
    this.conversationId.catch(() => (this.conversationId = null));
    return this.conversationId;
  }
  // ---- model and mode (requirement 4) ----
  listProviders() {
    return this.call('chat_router', 'ListProviders', {});
  }
  listModels(provider?: string) {
    return this.call('chat_router', 'ListModels', provider ? { provider } : {});
  }
  setSelection(provider_id: string, model_id: string) {
    return this.call('chat_router', 'SetSelection', { provider_id, model_id });
  }
  getContext() {
    return this.call('project', 'get_context', {});
  }
  selectContext(mode: string, project_id?: string) {
    return this.call('project', 'select_context', project_id ? { mode, project_id } : { mode });
  }
}
