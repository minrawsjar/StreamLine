/**
 * Headless REST client for the StreamLine Rust indexer.
 */

export type StreamRecord = {
  id: string;
  sender: string;
  freelancer: string;
  coin_type: string;
  total: number;
  remaining: number;
  state: "locked" | "pending_review" | "dripping" | "paused" | "done";
  current_milestone: number;
  n_milestones: number;
  duration_ms: number;
  drip_interval_ms: number;
  last_drip_ms: number;
  review_deadline_ms: number | null;
  created_at_ms: number;
};

export type DripRecord = {
  id: number;
  stream_id: string;
  amount: number;
  timestamp_ms: number;
  tx_digest: string | null;
};

export class IndexerClient {
  constructor(private readonly baseUrl: string) {}

  private async getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`indexer ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  health(): Promise<{ ok?: boolean }> {
    return this.getJson("/health");
  }

  list(params: {
    freelancer?: string;
    sender?: string;
  } = {}): Promise<StreamRecord[]> {
    const q = new URLSearchParams();
    if (params.freelancer) q.set("freelancer", params.freelancer);
    if (params.sender) q.set("sender", params.sender);
    const qs = q.toString();
    return this.getJson(`/streams${qs ? `?${qs}` : ""}`);
  }

  get(id: string): Promise<StreamRecord> {
    return this.getJson(`/stream/${id}`);
  }

  drips(streamId: string): Promise<DripRecord[]> {
    return this.getJson(`/stream/${streamId}/drips`);
  }
}
