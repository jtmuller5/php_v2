import Link from "next/link";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

interface NeuronCardProps {
  id: number;
  nickname: string;
  name: string;
  subregion: string;
  excitInhib: "excitatory" | "inhibitory" | "unknown";
}

export function NeuronCard({
  id,
  nickname,
  name,
  subregion,
  excitInhib,
}: NeuronCardProps) {
  return (
    <Link
      href={`/neurons/${id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-gray-900 group-hover:text-blue-600">
            {nickname}
          </h3>
          <p className="mt-1 truncate text-sm text-gray-500">{name}</p>
        </div>
        <SubregionBadge subregion={subregion} size="sm" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            excitInhib === "excitatory"
              ? "bg-green-500"
              : excitInhib === "inhibitory"
                ? "bg-red-500"
                : "bg-gray-400"
          }`}
        />
        <span className="text-xs text-gray-400 capitalize">{excitInhib}</span>
      </div>
    </Link>
  );
}
