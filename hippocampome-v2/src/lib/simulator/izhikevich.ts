export interface IzhParams {
  k: number;
  a: number;
  b: number;
  d: number;
  C: number;
  Vr: number;
  Vt: number;
  Vpeak: number;
  Vmin: number;
}

export interface SimulationResult {
  t: Float64Array;
  v: Float64Array;
  u: Float64Array;
}

export interface SimulationConfig {
  params: IzhParams;
  inputCurrent: number;
  duration: number; // ms
  stimStart: number; // ms
  stimEnd: number; // ms
  dt?: number; // ms, default 0.001
}

/**
 * 4th-order Runge-Kutta integrator for the Izhikevich model.
 * Ported directly from simulate.php lines 73-200.
 */
function derivatives(
  v: number,
  u: number,
  I: number,
  params: IzhParams
): [number, number] {
  const { k, Vr, Vt, C, a, b } = params;
  const dvdt = (k * (v - Vr) * (v - Vt) - u + I) / C;
  const dudt = a * (b * (v - Vr) - u);
  return [dvdt, dudt];
}

function rk4Step(
  v: number,
  u: number,
  I: number,
  dt: number,
  params: IzhParams
): [number, number] {
  const [k1v, k1u] = derivatives(v, u, I, params);
  const [k2v, k2u] = derivatives(
    v + 0.5 * dt * k1v,
    u + 0.5 * dt * k1u,
    I,
    params
  );
  const [k3v, k3u] = derivatives(
    v + 0.5 * dt * k2v,
    u + 0.5 * dt * k2u,
    I,
    params
  );
  const [k4v, k4u] = derivatives(
    v + dt * k3v,
    u + dt * k3u,
    I,
    params
  );

  const newV = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  const newU = u + (dt / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);

  return [newV, newU];
}

export function simulate(config: SimulationConfig): SimulationResult {
  const { params, inputCurrent, duration, stimStart, stimEnd } = config;
  const dt = config.dt ?? 0.001;
  const steps = Math.floor(duration / dt);

  // Downsample to keep arrays manageable (max ~10000 points for plotting)
  const downsample = Math.max(1, Math.floor(steps / 10000));
  const outputSize = Math.floor(steps / downsample) + 1;

  const t = new Float64Array(outputSize);
  const v = new Float64Array(outputSize);
  const u = new Float64Array(outputSize);

  let currentV = params.Vr;
  let currentU = 0;
  let outputIdx = 0;

  for (let i = 0; i <= steps; i++) {
    const time = i * dt;
    const I = time >= stimStart && time <= stimEnd ? inputCurrent : 0;

    // Record downsampled output
    if (i % downsample === 0 && outputIdx < outputSize) {
      t[outputIdx] = time;
      v[outputIdx] = currentV;
      u[outputIdx] = currentU;
      outputIdx++;
    }

    // RK4 integration step
    [currentV, currentU] = rk4Step(currentV, currentU, I, dt, params);

    // Spike detection and reset
    if (currentV > params.Vpeak) {
      currentV = params.Vmin;
      currentU += params.d;
    }
  }

  return { t, v, u };
}

/**
 * Two-compartment Izhikevich model.
 */
export interface TwoCompartmentConfig {
  soma: IzhParams;
  dendrite: IzhParams;
  couplingG: number;
  couplingP: number;
  inputCurrent: number;
  duration: number;
  stimStart: number;
  stimEnd: number;
  dt?: number;
}

export interface TwoCompartmentResult {
  t: Float64Array;
  vSoma: Float64Array;
  vDendrite: Float64Array;
}

export function simulateTwoCompartment(
  config: TwoCompartmentConfig
): TwoCompartmentResult {
  const { soma, dendrite, couplingG, couplingP, inputCurrent, duration, stimStart, stimEnd } = config;
  const dt = config.dt ?? 0.001;
  const steps = Math.floor(duration / dt);
  const downsample = Math.max(1, Math.floor(steps / 10000));
  const outputSize = Math.floor(steps / downsample) + 1;

  const t = new Float64Array(outputSize);
  const vSoma = new Float64Array(outputSize);
  const vDendrite = new Float64Array(outputSize);

  let v1 = soma.Vr, u1 = 0;
  let v2 = dendrite.Vr, u2 = 0;
  let outputIdx = 0;

  for (let i = 0; i <= steps; i++) {
    const time = i * dt;
    const I = time >= stimStart && time <= stimEnd ? inputCurrent : 0;

    if (i % downsample === 0 && outputIdx < outputSize) {
      t[outputIdx] = time;
      vSoma[outputIdx] = v1;
      vDendrite[outputIdx] = v2;
      outputIdx++;
    }

    // Coupling currents
    const ic1 = couplingG * couplingP * (v2 - v1);
    const ic2 = couplingG * couplingP * (v1 - v2);

    // Soma
    const [dv1, du1] = derivatives(v1, u1, I + ic1, soma);
    // Dendrite
    const [dv2, du2] = derivatives(v2, u2, ic2, dendrite);

    // Simple Euler for coupled system (RK4 coupling is complex)
    v1 += dt * dv1;
    u1 += dt * du1;
    v2 += dt * dv2;
    u2 += dt * du2;

    if (v1 > soma.Vpeak) {
      v1 = soma.Vmin;
      u1 += soma.d;
    }
    if (v2 > dendrite.Vpeak) {
      v2 = dendrite.Vmin;
      u2 += dendrite.d;
    }
  }

  return { t, vSoma, vDendrite };
}
