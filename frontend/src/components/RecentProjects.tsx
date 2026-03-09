import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import { getRecentProjects, type RecentProjectSummary } from "@/lib/api";

const RecentProjects = () => {
  const [projects, setProjects] = useState<RecentProjectSummary[]>([]);

  useEffect(() => {
    void (async () => {
      const data = await getRecentProjects();
      setProjects(data);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Recent Projects</h3>
          <p className="text-sm text-muted-foreground">Continue where you left off</p>
        </div>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="group rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            {/* Thumbnail placeholder */}
            <div className="aspect-[4/3] bg-gradient-card flex items-center justify-center border-b border-border">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-sm truncate flex-1">{project.name}</h4>
                <button className="text-muted-foreground hover:text-foreground ml-2">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{project.genre}</span>
                <span>{project.theme}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> {project.images} images
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {project.date}
                </span>
              </div>
              {project.status === "in-progress" && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-primary" />
                  </div>
                  <span className="text-xs text-primary font-medium">67%</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentProjects;
