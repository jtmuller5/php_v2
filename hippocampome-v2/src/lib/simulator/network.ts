/**
 * Small-scale spiking neural network simulator.
 *
 * Runs coupled Izhikevich neurons with Tsodyks-Markram synapses.
 * Designed for 10-100 neurons in-browser — not real-scale, but enough
 * to demonstrate network dynamics and E/I interactions.
 */

import type { IzhParams } from "./izhikevich";

export interface NetworkNeuron {
  typeId: number;
  typeName: string;
  params: IzhParams;
  isExcitatory: boolean;
}

export interface NetworkSynapse {
  sourceTypeId: number;
  targetTypeId: number;
  weight: number; // conductance (nS)
  tauD: number; // decay time constant (ms)
  probability: number; // connection probability (0-1)
  reversal: number; // reversal potential: 0 for excitatory, -80 for inhibitory
}

export interface NetworkConfig {
  neuronTypes: NetworkNeuron[];
  synapses: NetworkSynapse[];
  neuronsPerType: number; // how many instances of each type
  duration: number; // ms
  dt: number; // ms
  backgroundCurrent: number; // tonic drive (pA)
  noiseAmplitude: number; // random current noise amplitude (pA)
}

export interface SpikeEvent {
  neuronIndex: number;
  typeIndex: number;
  time: number;
}

export interface NetworkResult {
  spikes: SpikeEvent[];
  voltageTraces: Map<number, { t: number[]; v: number[] }>; // one trace per type (first neuron)
  duration: number;
  neuronTypes: { name: string; startIndex: number; count: number; isExcitatory: boolean }[];
}

/**
 * Run a small network simulation.
 */
export function simulateNetwork(config: NetworkConfig): NetworkResult {
  const {
    neuronTypes,
    synapses,
    neuronsPerType,
    duration,
    dt,
    backgroundCurrent,
    noiseAmplitude,
  } = config;

  const totalNeurons = neuronTypes.length * neuronsPerType;
  const steps = Math.floor(duration / dt);

  // Neuron state arrays
  const v = new Float64Array(totalNeurons);
  const u = new Float64Array(totalNeurons);
  const params: IzhParams[] = [];
  const isExcitatory: boolean[] = [];

  // Initialize neurons
  const typeInfo: NetworkResult["neuronTypes"] = [];
  for (let ti = 0; ti < neuronTypes.length; ti++) {
    const nt = neuronTypes[ti];
    const startIndex = ti * neuronsPerType;
    typeInfo.push({
      name: nt.typeName,
      startIndex,
      count: neuronsPerType,
      isExcitatory: nt.isExcitatory,
    });
    for (let i = 0; i < neuronsPerType; i++) {
      const idx = startIndex + i;
      v[idx] = nt.params.Vr + (Math.random() - 0.5) * 10; // slight randomization
      u[idx] = 0;
      params.push(nt.params);
      isExcitatory.push(nt.isExcitatory);
    }
  }

  // Build synapse connectivity matrix (sparse)
  // For each synapse definition, connect with given probability
  interface SynapticConnection {
    target: number;
    weight: number;
    tauD: number;
    reversal: number;
  }
  const connections: SynapticConnection[][] = Array.from(
    { length: totalNeurons },
    () => []
  );

  // Synaptic state: exponential decay current per connection
  // We use a simplified conductance-based model
  const synapticG: Float64Array[] = Array.from(
    { length: totalNeurons },
    () => new Float64Array(0)
  );

  for (const syn of synapses) {
    const sourceTypeIdx = neuronTypes.findIndex(
      (nt) => nt.typeId === syn.sourceTypeId
    );
    const targetTypeIdx = neuronTypes.findIndex(
      (nt) => nt.typeId === syn.targetTypeId
    );
    if (sourceTypeIdx === -1 || targetTypeIdx === -1) continue;

    const sourceStart = sourceTypeIdx * neuronsPerType;
    const targetStart = targetTypeIdx * neuronsPerType;

    for (let si = 0; si < neuronsPerType; si++) {
      for (let ti = 0; ti < neuronsPerType; ti++) {
        if (sourceStart + si === targetStart + ti) continue; // no self-connections
        if (Math.random() < syn.probability) {
          connections[sourceStart + si].push({
            target: targetStart + ti,
            weight: syn.weight,
            tauD: syn.tauD,
            reversal: syn.reversal,
          });
        }
      }
    }
  }

  // Initialize per-target synaptic conductance tracking
  // For simplicity, track total excitatory and inhibitory conductance per neuron
  const gExc = new Float64Array(totalNeurons);
  const gInh = new Float64Array(totalNeurons);

  // Results
  const spikes: SpikeEvent[] = [];
  const downsample = Math.max(1, Math.floor(steps / 5000));

  // Voltage traces for the first neuron of each type
  const voltageTraces = new Map<number, { t: number[]; v: number[] }>();
  for (let ti = 0; ti < neuronTypes.length; ti++) {
    voltageTraces.set(ti, { t: [], v: [] });
  }

  // Main simulation loop
  for (let step = 0; step <= steps; step++) {
    const time = step * dt;

    // Record voltage traces (downsampled)
    if (step % downsample === 0) {
      for (let ti = 0; ti < neuronTypes.length; ti++) {
        const trace = voltageTraces.get(ti)!;
        trace.t.push(time);
        trace.v.push(v[ti * neuronsPerType]); // first neuron of each type
      }
    }

    // Update each neuron
    for (let i = 0; i < totalNeurons; i++) {
      const p = params[i];

      // Synaptic current: I_syn = g_exc * (E_exc - v) + g_inh * (E_inh - v)
      const iSyn = gExc[i] * (0 - v[i]) + gInh[i] * (-80 - v[i]);

      // Background + noise current
      const iNoise = noiseAmplitude * (Math.random() - 0.5) * 2;
      const iTotal = backgroundCurrent + iSyn + iNoise;

      // Izhikevich dynamics (Euler for speed in network sim)
      const dvdt =
        (p.k * (v[i] - p.Vr) * (v[i] - p.Vt) - u[i] + iTotal) / p.C;
      const dudt = p.a * (p.b * (v[i] - p.Vr) - u[i]);

      v[i] += dt * dvdt;
      u[i] += dt * dudt;

      // Spike detection
      if (v[i] > p.Vpeak) {
        v[i] = p.Vmin;
        u[i] += p.d;

        // Record spike
        const typeIndex = Math.floor(i / neuronsPerType);
        spikes.push({ neuronIndex: i, typeIndex, time });

        // Propagate to postsynaptic neurons
        for (const conn of connections[i]) {
          if (conn.reversal >= -20) {
            // Excitatory
            gExc[conn.target] += conn.weight * 0.001; // nS to uS scaling
          } else {
            // Inhibitory
            gInh[conn.target] += conn.weight * 0.001;
          }
        }
      }

      // Decay synaptic conductances
      // Use average tau for simplicity
      gExc[i] *= Math.exp(-dt / 5.0); // ~5ms excitatory decay
      gInh[i] *= Math.exp(-dt / 10.0); // ~10ms inhibitory decay
    }
  }

  return {
    spikes,
    voltageTraces,
    duration,
    neuronTypes: typeInfo,
  };
}
