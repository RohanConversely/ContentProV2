import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MoreHorizontal, Image as ImageIcon, Layers, Download } from "lucide-react";
import { getRecentProjects, type RecentProjectSummary, downloadBatchArchive } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const RecentProjects = () => {
  const [projects, setProjects] = useState<RecentProjectSummary[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    void (async () => {
      try {
        const data = await getRecentProjects();
        setProjects(data);
      } catch {
        setProjects([]);
      }
    })();
  }, [user?.id]);

  const handleDownloadBatch = async (e: React.MouseEvent, project: RecentProjectSummary) => {
    e.stopPropagation();
    if (project.batch_id) {
      await downloadBatchArchive(project.batch_id, project.name);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Recent Projects</h3>
          <p className="text-sm text-muted-foreground">Continue where you left off</p>
        </div>
        <button onClick={() => navigate("/projects")} className="text-sm text-primary hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            onClick={() => {
              if (project.batch_id) {
                navigate(`/batch/${project.batch_id}`);
              } else {
                navigate(`/project/${project.id}`);
              }
            }}
            className="group rounded-xl border border-border bg-card hover:bg-secondary/50 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            {/* Thumbnail placeholder */}
            <div className="aspect-[4/3] bg-gradient-card flex items-center justify-center border-b border-border relative">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
              {project.batch_id && (
                <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm text-primary-foreground px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  BATCH
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-sm truncate flex-1">{project.name}</h4>
                <div className="flex items-center gap-1">
                   {project.batch_id && project.status === "completed" && (
                    <button 
                      onClick={(e) => void handleDownloadBatch(e, project)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      title="Download Batch ZIP"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button className="text-muted-foreground hover:text-foreground ml-1">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
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
              {project.batch_id && project.total_jobs && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {project.total_jobs} Jobs in Batch
                  </p>
                </div>
              )}
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
