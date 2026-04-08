export interface SimulationNeuronParams {
  id: number;
  nickname: string;
  subregion: string;
  excit_inhib: string;
  population_count: number | null;
  population_lower: number | null;
  population_upper: number | null;
  firing_pattern: string | null;
  izh_k: number | null;
  izh_a: number | null;
  izh_b: number | null;
  izh_d: number | null;
  izh_C: number | null;
  izh_Vr: number | null;
  izh_Vt: number | null;
  izh_Vpeak: number | null;
  izh_Vmin: number | null;
}

export interface SimulationConnectionParams {
  source_id: number;
  source_nickname: string;
  target_id: number;
  target_nickname: string;
  layers: string;
  sp_mean: number | null;
  sp_stdev: number | null;
  noc_mean: number | null;
  noc_stdev: number | null;
  tm_conductance: number | null;
  tm_tau_d: number | null;
  tm_tau_r: number | null;
  tm_tau_f: number | null;
  tm_utilization: number | null;
}

export interface SimulationBundle {
  metadata: {
    exported_at: string;
    neuron_count: number;
    connection_count: number;
    source: string;
  };
  neurons: SimulationNeuronParams[];
  connections: SimulationConnectionParams[];
}
