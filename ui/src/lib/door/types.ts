// Shapes the UI reads from the door. Only the fields the UI uses are named; everything
// else passes through as unknown. The authority for these shapes is the backend:
// `fuse.get_catalog` (odbus-verified op-plugins state_plugins/fuse.rs, GetCatalog*) and
// the door's PluginService.CallMethod / StateSync.Subscribe (op-grpc-bridge operation.proto).
// Generated types replace these once the proto codegen step lands (tasks.md 2.1).

/** One call's receipt, returned unchanged from the door. */
export interface Receipt {
  operation_id?: string;
  outcome?: string; // for example "completed", "outcome_unknown", or a refusal
  success?: boolean;
  event_id?: number;
  result?: unknown;
  [key: string]: unknown;
}

/** The one thing the UI needs from the door to act: a single CallMethod. */
export interface Door {
  callMethod(plugin: string, method: string, args: unknown): Promise<Receipt>;
}

export interface CatalogOperation {
  method: string;
  call_path?: string;
  metadata_path?: string;
  currently_granted: boolean;
  [key: string]: unknown;
}

export interface CatalogPlugin {
  plugin_id: string;
  object_hash?: string;
  schema_hash: string;
  schema: unknown;
  operations: CatalogOperation[];
  state?: unknown;
}

export interface CatalogView {
  view_id: string;
  source_catalog_hash: string;
  source_catalog_generation: number;
  plugins: CatalogPlugin[];
}

export interface CatalogOutput {
  views: CatalogView[];
}
