import { useMemo, useState } from "react";
import { projects, type FilterTag } from "../../data/projects";
import { SectionHeading } from "../SectionHeading";
import { ProjectCard } from "../ProjectCard";
import { ProjectFilter } from "../ProjectFilter";

export function SelectedWork() {
  const [filter, setFilter] = useState<FilterTag | "All">("All");

  const visibleProjects = useMemo(() => {
    if (filter === "All") return projects;
    return projects.filter((p) => p.filterTags.includes(filter));
  }, [filter]);

  return (
    <section id="work" className="py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <SectionHeading
            eyebrow="Selected Work"
            title="Projects where data met business decisions"
            description="A selection of projects where I applied data, technology and business thinking to solve analytical problems."
          />
          <ProjectFilter active={filter} onChange={setFilter} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProjects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
