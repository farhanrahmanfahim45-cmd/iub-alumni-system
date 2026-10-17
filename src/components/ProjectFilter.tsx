import { cn } from "../lib/cn";
import type { FilterTag } from "../data/projects";

const FILTERS: (FilterTag | "All")[] = ["All", "SQL", "Python", "Power BI", "Excel", "Web App"];

interface ProjectFilterProps {
  active: FilterTag | "All";
  onChange: (filter: FilterTag | "All") => void;
}

export function ProjectFilter({ active, onChange }: ProjectFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter projects by tool">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          role="tab"
          aria-selected={active === filter}
          onClick={() => onChange(filter)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200",
            active === filter
              ? "bg-purple-500 border-purple-500 text-white"
              : "bg-white border-line text-body hover:border-purple-300 hover:text-purple-600"
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
