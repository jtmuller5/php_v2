"use client";

import { useState } from "react";
import Link from "next/link";
import type { NeuronConnection, FiringPattern, IzhModel, IzhCompartment } from "@/types/database";
import type { NeuronEvidenceItem } from "@/lib/queries/evidence";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { formatNumber } from "@/lib/utils/format";
import { IzhikevichSimulator } from "@/components/simulator/IzhikevichSimulator";

interface MorphologyItem {
  id: number;
  priority: number | null;
  unvetted: boolean;
  // Supabase returns joined single relations as objects, but the type system
  // sees them as arrays. We accept both forms and normalize in rendering.
  property: { id: number; subject: string; predicate: string; object: string } | { id: number; subject: string; predicate: string; object: string }[] | null;
  [key: string]: unknown;
}

function getProperty(m: MorphologyItem) {
  if (!m.property) return null;
  if (Array.isArray(m.property)) return m.property[0] ?? null;
  return m.property;
}

interface NeuronTabsProps {
  neuronId: number;
  morphology: MorphologyItem[];
  connections: NeuronConnection[];
  firingPatterns: FiringPattern[];
  izhModels: (IzhModel & { izh_compartment: IzhCompartment[] })[];
  phases: Array<{ id: number; theta: string | null; swr_ratio: string | null; other: string | null }>;
  evidence: NeuronEvidenceItem[];
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "morphology", label: "Morphology" },
  { id: "connectivity", label: "Connectivity" },
  { id: "firing", label: "Firing Patterns" },
  { id: "evidence", label: "Evidence" },
  { id: "simulate", label: "Simulate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NeuronTabs({
  neuronId,
  morphology,
  connections,
  firingPatterns,
  izhModels,
  phases,
  evidence,
}: NeuronTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const outgoing = connections.filter((c) => c.direction === "outgoing");
  const incoming = connections.filter((c) => c.direction === "incoming");

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewTab
            morphology={morphology}
            outgoing={outgoing}
            incoming={incoming}
            firingPatterns={firingPatterns}
            phases={phases}
          />
        )}
        {activeTab === "morphology" && (
          <MorphologyTab morphology={morphology} />
        )}
        {activeTab === "connectivity" && (
          <ConnectivityTab outgoing={outgoing} incoming={incoming} />
        )}
        {activeTab === "firing" && (
          <FiringPatternsTab firingPatterns={firingPatterns} />
        )}
        {activeTab === "evidence" && (
          <EvidenceTab evidence={evidence} />
        )}
        {activeTab === "simulate" && (
          <SimulateTab izhModels={izhModels} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  morphology,
  outgoing,
  incoming,
  firingPatterns,
  phases,
}: {
  morphology: NeuronTabsProps["morphology"];
  outgoing: NeuronConnection[];
  incoming: NeuronConnection[];
  firingPatterns: FiringPattern[];
  phases: NeuronTabsProps["phases"];
}) {
  // Group morphology by subject
  const subjects = new Map<string, typeof morphology>();
  morphology.forEach((m) => {
    const prop = getProperty(m);
    if (!prop) return;
    const key = prop.subject;
    if (!subjects.has(key)) subjects.set(key, []);
    subjects.get(key)!.push(m);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Morphology summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Morphology</h3>
        <div className="mt-4 space-y-3">
          {Array.from(subjects.entries())
            .slice(0, 5)
            .map(([subject, props]) => (
              <div key={subject}>
                <p className="text-sm font-medium capitalize text-gray-700">
                  {subject}
                </p>
                <p className="text-sm text-gray-500">
                  {props
                    .slice(0, 3)
                    .map((p) => {
                      const prop = getProperty(p);
                      return prop
                        ? `${prop.predicate} ${prop.object}`
                        : "";
                    })
                    .join("; ")}
                  {props.length > 3 && ` (+${props.length - 3} more)`}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Connection summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Outgoing ({outgoing.length})
            </p>
            <div className="mt-2 space-y-1">
              {outgoing.slice(0, 5).map((c) => (
                <Link
                  key={c.connected_type_id}
                  href={`/neurons/${c.connected_type_id}`}
                  className="block text-sm text-blue-600 hover:underline"
                >
                  {c.connected_nickname}
                </Link>
              ))}
              {outgoing.length > 5 && (
                <p className="text-xs text-gray-400">
                  +{outgoing.length - 5} more
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Incoming ({incoming.length})
            </p>
            <div className="mt-2 space-y-1">
              {incoming.slice(0, 5).map((c) => (
                <Link
                  key={c.connected_type_id}
                  href={`/neurons/${c.connected_type_id}`}
                  className="block text-sm text-blue-600 hover:underline"
                >
                  {c.connected_nickname}
                </Link>
              ))}
              {incoming.length > 5 && (
                <p className="text-xs text-gray-400">
                  +{incoming.length - 5} more
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Firing patterns summary */}
      {firingPatterns.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Firing Patterns
          </h3>
          <div className="mt-4 space-y-2">
            {firingPatterns.map((fp) => (
              <div key={fp.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {fp.overall_fp || "Unclassified"}
                </span>
                <span className="text-sm text-gray-500">
                  {fp.isi_avg_ms != null
                    ? `ISI avg: ${formatNumber(fp.isi_avg_ms)} ms`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phases summary */}
      {phases.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Oscillation Phases
          </h3>
          <div className="mt-4 space-y-2">
            {phases.map((phase) => (
              <div key={phase.id} className="text-sm text-gray-600">
                {phase.theta && <p>Theta: {phase.theta}</p>}
                {phase.swr_ratio && <p>SWR: {phase.swr_ratio}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Well-known marker abbreviation expansions
const MARKER_NAMES: Record<string, string> = {
  CB: "Calbindin",
  CR: "Calretinin",
  PV: "Parvalbumin",
  CCK: "Cholecystokinin",
  SOM: "Somatostatin",
  VIP: "Vasoactive Intestinal Polypeptide",
  NPY: "Neuropeptide Y",
  nNOS: "Neuronal Nitric Oxide Synthase",
  ENK: "Enkephalin",
  RLN: "Reelin",
  "5HT-3": "Serotonin Receptor 3",
  CB1: "Cannabinoid Receptor Type 1",
  "GABAa α1": "GABA-A Alpha 1 Subunit",
  mGluR1a: "Metabotropic Glutamate Receptor 1α",
  Mus2R: "Muscarinic Type 2 Receptor",
  vGluT3: "Vesicular Glutamate Transporter 3",
};

// Categorize properties by their semantic meaning
function categorizeProperties(morphology: MorphologyItem[]) {
  const markers: { subject: string; values: Map<string, number> }[] = [];
  const locations: { subject: string; predicate: string; object: string }[] = [];
  const other: { subject: string; predicate: string; object: string }[] = [];

  // Group by subject first
  const bySubject = new Map<string, MorphologyItem[]>();
  morphology.forEach((m) => {
    const prop = getProperty(m);
    if (!prop) return;
    if (!bySubject.has(prop.subject)) bySubject.set(prop.subject, []);
    bySubject.get(prop.subject)!.push(m);
  });

  bySubject.forEach((items, subject) => {
    const firstProp = getProperty(items[0]);
    if (!firstProp) return;

    if (firstProp.predicate === "has expression") {
      // Molecular marker — aggregate expression values
      const counts = new Map<string, number>();
      items.forEach((m) => {
        const p = getProperty(m);
        if (p) counts.set(p.object, (counts.get(p.object) ?? 0) + 1);
      });
      markers.push({ subject, values: counts });
    } else if (
      firstProp.predicate === "in" ||
      firstProp.predicate === "has location" ||
      firstProp.predicate === "located in"
    ) {
      // Morphological location data
      items.forEach((m) => {
        const p = getProperty(m);
        if (p) locations.push({ subject: p.subject, predicate: p.predicate, object: p.object });
      });
    } else {
      items.forEach((m) => {
        const p = getProperty(m);
        if (p) other.push({ subject: p.subject, predicate: p.predicate, object: p.object });
      });
    }
  });

  return { markers, locations, other };
}

function MorphologyTab({
  morphology,
}: {
  morphology: NeuronTabsProps["morphology"];
}) {
  const { markers, locations, other } = categorizeProperties(morphology);

  // Deduplicate locations
  const uniqueLocations = Array.from(
    new Map(
      locations.map((l) => [`${l.subject}-${l.predicate}-${l.object}`, l])
    ).values()
  );

  // Group locations by subject (axon, dendrite, soma)
  const locationGroups = new Map<string, typeof uniqueLocations>();
  uniqueLocations.forEach((l) => {
    if (!locationGroups.has(l.subject)) locationGroups.set(l.subject, []);
    locationGroups.get(l.subject)!.push(l);
  });

  // Deduplicate other
  const uniqueOther = Array.from(
    new Map(
      other.map((o) => [`${o.subject}-${o.predicate}-${o.object}`, o])
    ).values()
  );

  if (markers.length === 0 && uniqueLocations.length === 0 && uniqueOther.length === 0) {
    return <p className="text-gray-500">No morphology data available.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Molecular Markers */}
      {markers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Molecular Markers
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Expression of molecular biomarkers based on literature evidence
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markers.map(({ subject, values }) => {
              // Determine consensus
              const positive = (values.get("positive") ?? 0) + (values.get("weak_positive") ?? 0);
              const negative = values.get("negative") ?? 0;
              const total = positive + negative;
              const isPositive = positive > negative;
              const isMixed = positive > 0 && negative > 0;

              return (
                <div
                  key={subject}
                  className={`rounded-lg border p-4 ${
                    isMixed
                      ? "border-yellow-200 bg-yellow-50"
                      : isPositive
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {subject}
                      </p>
                      {MARKER_NAMES[subject] && (
                        <p className="text-xs text-gray-500">
                          {MARKER_NAMES[subject]}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isMixed
                          ? "bg-yellow-200 text-yellow-800"
                          : isPositive
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                      }`}
                    >
                      {isMixed ? "Mixed" : isPositive ? "Positive" : "Negative"}
                    </span>
                  </div>
                  {total > 1 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {positive} positive, {negative} negative across{" "}
                      {total} evidence records
                    </p>
                  )}
                  {values.has("weak_positive") && (
                    <p className="mt-1 text-xs text-gray-400">
                      Includes {values.get("weak_positive")} weak positive
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Morphological Locations */}
      {locationGroups.size > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Morphological Features
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Location of neuronal structures across hippocampal layers
          </p>
          <div className="mt-4 space-y-4">
            {Array.from(locationGroups.entries()).map(
              ([structure, locs]) => (
                <div key={structure}>
                  <p className="text-sm font-semibold capitalize text-gray-700">
                    {structure}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {locs.map((l, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-700"
                      >
                        {l.object}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Other Properties */}
      {uniqueOther.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Other Properties
          </h3>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 font-medium">Property</th>
                <th className="pb-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {uniqueOther.map((o, i) => (
                <tr key={i}>
                  <td className="py-2 capitalize text-gray-700">
                    {o.subject}
                  </td>
                  <td className="py-2 text-gray-600">{o.predicate}</td>
                  <td className="py-2 font-medium text-gray-900">
                    {o.object}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConnectivityTab({
  outgoing,
  incoming,
}: {
  outgoing: NeuronConnection[];
  incoming: NeuronConnection[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ConnectionList title="Outgoing Connections" connections={outgoing} />
      <ConnectionList title="Incoming Connections" connections={incoming} />
    </div>
  );
}

function ConnectionList({
  title,
  connections,
}: {
  title: string;
  connections: NeuronConnection[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {title} ({connections.length})
      </h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-2 font-medium">Neuron</th>
              <th className="pb-2 font-medium">Region</th>
              <th className="pb-2 font-medium">Layers</th>
              <th className="pb-2 font-medium text-right">SP</th>
              <th className="pb-2 font-medium text-right">NOC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {connections.map((c) => (
              <tr key={c.connected_type_id}>
                <td className="py-2">
                  <Link
                    href={`/neurons/${c.connected_type_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {c.connected_nickname}
                  </Link>
                </td>
                <td className="py-2">
                  <SubregionBadge subregion={c.connected_subregion} size="sm" />
                </td>
                <td className="py-2 text-gray-600">{c.layers}</td>
                <td className="py-2 text-right text-gray-600">
                  {c.sp_mean != null ? formatNumber(c.sp_mean, 4) : "\u2014"}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {c.noc_mean != null ? formatNumber(c.noc_mean, 2) : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {connections.length === 0 && (
          <p className="mt-4 text-gray-500">No connections recorded.</p>
        )}
      </div>
    </div>
  );
}

function FiringPatternsTab({
  firingPatterns,
}: {
  firingPatterns: FiringPattern[];
}) {
  if (firingPatterns.length === 0) {
    return <p className="text-gray-500">No firing pattern data available.</p>;
  }

  return (
    <div className="space-y-6">
      {firingPatterns.map((fp) => (
        <div
          key={fp.id}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            {fp.overall_fp || "Firing Pattern"}
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Delay</p>
              <p className="text-sm font-medium">
                {fp.delay_ms != null ? `${formatNumber(fp.delay_ms)} ms` : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ISI Average</p>
              <p className="text-sm font-medium">
                {fp.isi_avg_ms != null
                  ? `${formatNumber(fp.isi_avg_ms)} ms`
                  : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spike Amplitude</p>
              <p className="text-sm font-medium">
                {fp.swa_mv != null ? `${formatNumber(fp.swa_mv)} mV` : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Accommodation Index</p>
              <p className="text-sm font-medium">
                {fp.accommodation_index != null
                  ? formatNumber(fp.accommodation_index, 3)
                  : "\u2014"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimulateTab({
  izhModels,
}: {
  izhModels: (IzhModel & { izh_compartment: IzhCompartment[] })[];
}) {
  const preferredModel = izhModels.find((m) => m.preferred) ?? izhModels[0];

  if (!preferredModel || preferredModel.izh_compartment.length === 0) {
    return (
      <p className="text-gray-500">
        No Izhikevich model parameters available for this neuron type.
      </p>
    );
  }

  const soma = preferredModel.izh_compartment.find(
    (c) => c.compartment_index === 0
  );

  if (!soma) {
    return <p className="text-gray-500">No compartment data available.</p>;
  }

  return (
    <IzhikevichSimulator
      params={{
        k: soma.k ?? 0,
        a: soma.a ?? 0,
        b: soma.b ?? 0,
        d: soma.d ?? 0,
        C: soma.capacitance ?? 100,
        Vr: soma.v_rest ?? -60,
        Vt: soma.v_threshold ?? -40,
        Vpeak: soma.v_peak ?? 35,
        Vmin: soma.v_min ?? -45,
      }}
      modelName={preferredModel.name ?? "Izhikevich Model"}
    />
  );
}

function EvidenceTab({ evidence }: { evidence: NeuronEvidenceItem[] }) {
  // Filter out evidence stubs with no fragment or article linked
  const meaningful = evidence.filter(
    (e) => e.fragment_quote || e.article_title
  );

  if (meaningful.length === 0) {
    return <p className="text-gray-500">No evidence records available.</p>;
  }

  // Group by property (subject + predicate + object)
  const groups = new Map<
    string,
    { label: string; items: NeuronEvidenceItem[] }
  >();

  meaningful.forEach((e) => {
    const key = e.property_subject && e.property_predicate && e.property_object
      ? `${e.property_subject} | ${e.property_predicate} | ${e.property_object}`
      : "Other";
    if (!groups.has(key)) {
      groups.set(key, {
        label:
          e.property_subject
            ? `${e.property_subject} ${e.property_predicate} ${e.property_object}`
            : "Other",
        items: [],
      });
    }
    groups.get(key)!.items.push(e);
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {meaningful.length} evidence records from{" "}
        {new Set(meaningful.filter((e) => e.article_id).map((e) => e.article_id)).size}{" "}
        articles
      </p>

      {Array.from(groups.entries()).map(([key, group]) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <h3 className="text-base font-semibold capitalize text-gray-900">
            {group.label}
          </h3>
          <div className="mt-4 space-y-4">
            {group.items.map((item, i) => (
              <div key={`${item.evidence_id}-${i}`} className="border-l-4 border-gray-200 pl-4">
                {item.fragment_quote && (
                  <blockquote className="text-sm leading-relaxed text-gray-700 italic">
                    &ldquo;{item.fragment_quote}&rdquo;
                    {item.fragment_page && (
                      <span className="ml-2 text-xs not-italic text-gray-400">
                        p. {item.fragment_page}
                      </span>
                    )}
                  </blockquote>
                )}
                {item.article_title && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                    {item.article_id ? (
                      <Link
                        href={`/articles/${item.article_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {item.article_title}
                      </Link>
                    ) : (
                      <span>{item.article_title}</span>
                    )}
                    {item.article_year && (
                      <span className="text-gray-400">({item.article_year})</span>
                    )}
                    {item.article_pmid && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
                        PMID: {item.article_pmid}
                      </span>
                    )}
                  </div>
                )}
                {!item.fragment_quote && item.article_title && (
                  <p className="text-xs italic text-gray-400">
                    No quote available
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
