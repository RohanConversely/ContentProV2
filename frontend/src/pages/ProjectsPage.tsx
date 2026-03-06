import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Image as ImageIcon,
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Eye,
  Download,
  Plus,
  Filter,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { mockProjects } from "@/lib/mock_data";
import type { Project } from "@/lib/types";

const statusConfig = {
  processing: { label: "Processing", icon: Loader2, color: "text-primary", bg: "bg-primary/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const typeConfig = {
  images: { label: "Images Only", icon: ImageIcon },
  video: { label: "Images + Video", icon: Video },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ProjectsPage = () => {
  const [filter, setFilter] = useState<"all" | "completed" | "processing" | "failed">("all");
  const projects = mockProjects;

  const filteredProjects = projects.filter((project) => {
    if (filter === "all") return true;
    return project.status === filter;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Your <span className="text-gradient">Projects</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all your content generation projects
            </p>
          </div>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "completed", "processing", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-primary/10 border border-primary/40 text-primary"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const status = statusConfig[project.status];
                const type = typeConfig[project.type];
                const TypeIcon = type.icon;
                const StatusIcon = status.icon;
                const thumbnail = project.images?.[0]?.url || project.video?.thumbnail;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-secondary relative">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Status badge */}
                      <div
                        className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status.bg} ${status.color}`}
                      >
                        <StatusIcon
                          className={`h-3 w-3 ${project.status === "processing" ? "animate-spin" : ""}`}
                        />
                        {status.label}
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {type.label}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-display font-semibold truncate mb-1">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.createdAt)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {project.status === "completed" && (
                          <>
                            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors">
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors">
                              <Download className="h-3.5 w-3.5" /> Download
                            </button>
                          </>
                        )}
                        {project.status === "processing" && (
                          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> In Progress
                          </button>
                        )}
                        {project.status === "failed" && (
                          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </button>
                        )}
                        <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <FolderOpen className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Create Your First Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
