import { UPCOMING_PROJECT_MODULES } from "@/constants/project";
import { Card, CardContent } from "@/components/ui/card";

export function UpcomingModules() {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-900">
        Project modules
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        These tools will be added in a later phase.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {UPCOMING_PROJECT_MODULES.map((module) => (
          <Card key={module.title} className="opacity-80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-800">
                  {module.title}
                </h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-500">
                {module.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
