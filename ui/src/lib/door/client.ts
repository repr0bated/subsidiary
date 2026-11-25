import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type { JsonValue } from '@protobuf-ts/runtime';
import { Value } from './gen/google/protobuf/struct';
import { ChangeType, StateFrameKind, type StateChange } from './gen/operation';
import { PluginServiceClient, StateSyncClient } from './gen/operation.client';
import type { Frame } from '../state/reducer';
import type { CatalogOutput, Door, Receipt } from './types';

/**
 * The browser's only path to the backend: the door's gRPC-Web services (design §2).
 * Every action is one PluginService.CallMethod as the container identity; state comes from StateSync.Subscribe.
 * Identity is the container's own SID1, injected into the page by the container (door/identity.ts); never minted here.
 */

export const PLUGIN_OBJECT_ROOT = '/org/opdbus/v1/plugins';
export const PLUGIN_INTERFACE = 'org.opdbus.v1.PluginV1';
const CAPABILITY_HEADER = 'x-opdbus-capability';

/** Where the identity metadata comes from: the container's injected SID1 (door/identity.ts). Not minted here. */
export interface IdentitySource {
  metadata(): Promise<Record<string, string>>;
}

/** D-Bus object path for a sealed plugin id (op_plugins::canonical::plugin_path). */
export function pluginObjectPath(pluginId: string): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(pluginId)) throw new Error('invalid plugin id');
  let seg = pluginId.toLowerCase().replace(/-/g, '_');
  if (/^[0-9]/.test(seg)) seg = `plugin_${seg}`;
  return `${PLUGIN_OBJECT_ROOT}/${seg}`;
}

/**
 * The capability a call declares, read from the sealed schema in the catalog. Used only to make
 * the call; the chatbot never renders it.
 */
export function capabilityFor(catalog: CatalogOutput | undefined, plugin: string, method: string): string {
  for (const view of catalog?.views ?? []) {
    const p = view.plugins.find((x) => x.plugin_id === plugin);
    const methods = (p?.schema as { methods?: Record<string, { required_capability?: string }> } | undefined)?.methods;
    const cap = methods?.[method]?.required_capability;
    if (cap) return cap;
  }
  return '';
}

export interface DoorOptions {
  baseUrl: string;
  identity: IdentitySource;
  /** The current catalog, for each call's declared capability. */
  catalog: () => CatalogOutput | undefined;
  timeoutMs?: number;
}

export function createDoor(opts: DoorOptions) {
  const transport = new GrpcWebFetchTransport({ baseUrl: opts.baseUrl, format: 'binary', fetchInit: { credentials: 'omit' } });
  const plugins = new PluginServiceClient(transport);
  const state = new StateSyncClient(transport);

  const door: Door = {
    async callMethod(plugin, method, args) {
      const capability = method === 'get_catalog' && plugin === 'fuse' ? 'cap.storage.fuse.contract.read@v1' : capabilityFor(opts.catalog(), plugin, method);
      const meta = { ...(await opts.identity.metadata()), ...(capability ? { [CAPABILITY_HEADER]: capability } : {}) };
      const { response } = await plugins.callMethod(
        {
          pluginId: plugin,
          objectPath: pluginObjectPath(plugin),
          interfaceName: PLUGIN_INTERFACE,
          methodName: method,
          arguments: [Value.fromJson((args ?? {}) as JsonValue)],
          actorId: '',
          capabilityId: capability
        },
        { meta, timeout: opts.timeoutMs ?? 60_000 }
      );
      const receipt: Receipt = {
        success: response.success,
        event_id: Number(response.eventId || 0),
        outcome: response.error ? 'refused' : response.success ? 'completed' : 'outcome_unknown',
        result: response.result ? Value.toJson(response.result) : undefined
      };
      return receipt;
    }
  };

  /** Subscribe first, then hydration and live frames, mapped for the reducer. Never polls. */
  async function* subscribe(pluginIds: string[] = [], signal?: AbortSignal): AsyncGenerator<Frame> {
    const meta = await opts.identity.metadata();
    const call = state.subscribe(
      { pluginIds, pathPatterns: [], tags: [], includeInitialState: true, includeSchema: true },
      { meta, abort: signal }
    );
    for await (const c of call.responses) yield toFrame(c);
  }

  return { door, subscribe };
}

/** Map one StateChange into the reducer's frame. */
export function toFrame(c: StateChange): Frame {
  const kind = c.frameKind === StateFrameKind.HEARTBEAT ? 'heartbeat' : c.frameKind === StateFrameKind.INITIAL_STATE ? 'initial' : 'update';
  const schema = c.changeType === ChangeType.SCHEMA_MIGRATION;
  const value = c.newValue ? Value.toJson(c.newValue) : undefined;
  const tombstone = !schema && (c.changeType === ChangeType.OBJECT_REMOVED || c.changeType === ChangeType.PROPERTY_DELETE || value === undefined);
  return {
    plugin_id: c.pluginId,
    object_path: c.objectPath,
    kind,
    schema,
    tombstone: kind === 'heartbeat' ? false : tombstone,
    value,
    schema_hash: c.schemaHash,
    catalog_hash: c.catalogHash,
    state_generation: BigInt(c.stateGeneration || '0')
  };
}
