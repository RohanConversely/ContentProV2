import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Image, Video, Clock, Trash2, Download, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Project {
  id: string;
  name: string;
  type: "images" | "video";
  status: "processing" | "completed" | "failed";
  createdAt: string;
  thumbnail: string;
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Tatsya Marble Jewelry Stand",
    type: "video",
    status: "completed",
    createdAt: "2024-01-15T10:30:00Z",
    thumbnail: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    name: "Bath Set Collection",
    type: "images",
    status: "completed",
    createdAt: "2024-01-14T14:20:00Z",
    thumbnail: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Trinket Plate Organizer",
    type: "video",
    status: "processing",
    createdAt: "2024-01-16T09:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=300&fit=crop",
  },
];

const ProjectsPage = () => {
  const [projects] = useState<Project[]>(mockProjects);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "processing":
        return "bg-yellow-500/10 text-yellow-500";
      case "failed":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all your generated content
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-primary-foreground rounded-lg font-semibold shadow-glow hover:opacity-90 transition-opacity"
            >
              Create New Project
            </a>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {project.status === "processing" && (
                        <Clock className="h-3 w-3 animate-spin" />
                      )}
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                      {project.type === "video" ? (
                        <>
                          <Video className="h-3 w-3" /> Video
                        </>
                      ) : (
                        <>
                          <Image className="h-3 w-3" /> Images
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 truncate">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Created {formatDate(project.createdAt)}
                  </p>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium">
                      <ExternalLink className="h-4 w-4" />
                      View
                    </button>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
