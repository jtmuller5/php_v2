import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { getNeuronWithRelations } from "@/lib/queries/neurons";
import { getNeuronConnections } from "@/lib/queries/connectivity";
import { getNeuronMorphology, getEvidenceForNeuron } from "@/lib/queries/evidence";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { StatCard } from "@/components/ui/StatCard";
import { formatExcitInhib, formatPopulation } from "@/lib/utils/format";
import { NeuronTabs } from "./NeuronTabs";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: neuron } = await supabase
    .from("neuron_type")
    .select("nickname, subregion_id, name")
    .eq("id", Number(id))
    .single();

  if (!neuron) return { title: "Neuron Not Found" };

  return {
    title: `${neuron.subregion_id}: ${neuron.nickname} — Hippocampome`,
    description: neuron.name,
  };
}

export default async function NeuronPage({ params }: PageProps) {
  const { id } = await params;
  const neuronId = Number(id);
  if (isNaN(neuronId)) notFound();

  const supabase = await createServerSupabase();

  const [neuron, connections, morphology, evidenceData] = await Promise.all([
    getNeuronWithRelations(supabase, neuronId),
    getNeuronConnections(supabase, neuronId),
    getNeuronMorphology(supabase, neuronId),
    getEvidenceForNeuron(supabase, neuronId),
  ]);

  if (!neuron) notFound();

  const outgoing = connections.filter((c) => c.direction === "outgoing");
  const incoming = connections.filter((c) => c.direction === "incoming");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/neurons" className="hover:text-gray-700">
          Neurons
        </Link>
        <span>/</span>
        <Link
          href={`/neurons?region=${neuron.subregion_id}`}
          className="hover:text-gray-700"
        >
          {neuron.subregion_id}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{neuron.nickname}</span>
      </nav>

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {neuron.nickname}
            </h1>
            <SubregionBadge subregion={neuron.subregion_id} />
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                neuron.excit_inhib === "excitatory"
                  ? "bg-green-100 text-green-700"
                  : neuron.excit_inhib === "inhibitory"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  neuron.excit_inhib === "excitatory"
                    ? "bg-green-500"
                    : neuron.excit_inhib === "inhibitory"
                      ? "bg-red-500"
                      : "bg-gray-400"
                }`}
              />
              {formatExcitInhib(neuron.excit_inhib)}
            </span>
          </div>
          <p className="mt-2 text-gray-500">{neuron.name}</p>
          {neuron.synonyms && neuron.synonyms.length > 0 && (
            <p className="mt-2 text-sm text-gray-400">
              Also known as:{" "}
              {neuron.synonyms
                .map((s: { name: string }) => s.name)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Population"
          value={
            neuron.population?.count_value != null
              ? neuron.population.count_value.toLocaleString()
              : "\u2014"
          }
          sublabel={
            neuron.population?.lower_bound != null &&
            neuron.population?.upper_bound != null
              ? `${neuron.population.lower_bound.toLocaleString()}\u2013${neuron.population.upper_bound.toLocaleString()}`
              : undefined
          }
        />
        <StatCard
          label="Outgoing Connections"
          value={outgoing.length}
        />
        <StatCard
          label="Incoming Connections"
          value={incoming.length}
        />
        <StatCard
          label="Morphology Properties"
          value={morphology.length}
        />
      </div>

      {/* Tabbed content */}
      <div className="mt-8">
        <NeuronTabs
          neuronId={neuronId}
          morphology={morphology}
          connections={connections}
          firingPatterns={neuron.firing_patterns}
          izhModels={neuron.izh_models}
          phases={neuron.phases}
          evidence={evidenceData}
        />
      </div>
    </div>
  );
}
