import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Image, Video, Clock, Trash2, Download, ExternalLink,
  ArrowLeft, Building2, Globe, Play, Maximize2, X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getProjects,
  deleteProject,
  downloadFile,
  downloadJobImagesArchive,
  getJobLogs,
  type JobLogEntry,
  type Project,
} from "@/lib/api";

/* ──────────────────────────────────────────────────── */
/*  Project Detail View                                 */
/* ──────────────────────────────────────────────────── */
const ProjectDetailView = ({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<JobLogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const { detail } = project;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const logs = await getJobLogs(project.id);
        if (!cancelled) {
          setJobLogs(logs);
          setLogsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setJobLogs([]);
          setLogsError(error instanceof Error ? error.message : "Unable to load job logs.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const handleDownloadImage = async (src: string, index: number) => {
    await downloadFile(src, `${project.name || "project-image"}-${index + 1}.png`);
  };
  const handleDownloadAll = async () => {
    await downloadJobImagesArchive(project.id, `${detail.brandName}_${detail.productName}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">{project.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {project.type === "video" ? "Video + Images" : "Images"} &middot; Created{" "}
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{detail.productName}</p>
              <p className="text-xs text-muted-foreground">{detail.images.length} images generated</p>
            </div>
          </div>
          {detail.brandWebsite && (
            <a
              href={detail.brandWebsite.startsWith("http") ? detail.brandWebsite : `https://${detail.brandWebsite}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-primary hover:bg-secondary transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {detail.brandWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => void handleDownloadAll()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download All
          </button>
        </div>

        {detail.inputImages && detail.inputImages.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <span className="text-xs text-muted-foreground">Input Images</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {detail.inputImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setPreviewImage(src)}
                  className="overflow-hidden rounded-lg border border-border bg-background/60 aspect-square"
                >
                  <img
                    src={src}
                    alt={`Input image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-border">
          <div className="space-y-1">
            <span className="text-muted-foreground">Brand</span>
            <p className="font-medium truncate">{detail.brandName || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Product</span>
            <p className="font-medium truncate">{detail.productName || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Category</span>
            <p className="font-medium truncate">{detail.productCategory || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Dimensions</span>
            <p className="font-medium truncate">{detail.dimensions || "—"}</p>
          </div>
        </div>

        {detail.productDescription && (
          <div className="pt-2 border-t border-border space-y-1">
            <span className="text-xs text-muted-foreground">Description</span>
            <p className="text-xs">{detail.productDescription}</p>
          </div>
        )}

        {detail.socialLinks && detail.socialLinks.length > 0 && (
          <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">Social Links:</span>
            {detail.socialLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all"
              >
                {link}
              </a>
            ))}
          </div>
        )}

        {detail.additionalInfo && Object.keys(detail.additionalInfo).length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <span className="text-xs text-muted-foreground">Additional Information</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {Object.entries(detail.additionalInfo).map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <p className="text-muted-foreground">{key}</p>
                  <p className="break-words">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Job Logs</h3>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          {logsError ? (
            <p className="text-sm text-destructive">{logsError}</p>
          ) : jobLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs recorded for this job yet.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto font-mono text-xs">
              {jobLogs.map((log, index) => (
                <div key={`${log.loggedAt}-${index}`} className="rounded-lg border border-border/80 bg-background/60 p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{new Date(log.loggedAt).toLocaleString()}</span>
                    <span>{log.level}</span>
                    <span>{log.stage || "pipeline"}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated Images */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Generated Images</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {detail.images.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group relative aspect-square rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-glow transition-all duration-300"
            >
              <img
                src={src}
                alt={`Generated Image ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                <div className="translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-sm font-semibold">Image {i + 1}</p>
                  <p className="text-xs text-muted-foreground">1024 × 1024</p>
                </div>
                <div className="flex items-center gap-1.5 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button
                    onClick={() => setPreviewImage(src)}
                    className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDownloadImage(src, i)}
                    className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video section (video projects only) */}
      {project.type === "video" && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">Generated Video</h3>
          {detail.videoUrl ? (
            <div className="relative aspect-video rounded-xl border border-border bg-card overflow-hidden max-w-2xl">
              <video
                src={detail.videoUrl}
                controls
                className="h-full w-full object-cover"
                poster={detail.images[0]}
              />
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-5 max-w-2xl">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 text-primary ml-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium">Video is being processed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your video will appear here once generation is complete.
                </p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                  <Clock className="h-3 w-3 animate-spin" /> Processing
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={previewImage}
              alt="Preview"
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ──────────────────────────────────────────────────── */
/*  Projects Page                                       */
/* ──────────────────────────────────────────────────── */
const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await getProjects();
      setProjects(data);
    })();
  }, []);

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
        {selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <>
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
                        <button
                          onClick={() => setSelectedProject(project)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          onClick={() => void downloadJobImagesArchive(project.id, `${project.detail.brandName}_${project.detail.productName}`)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-secondary transition-colors text-destructive"
                          onClick={() => setProjectToDelete(project)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be visible in your Projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!projectToDelete) return;
                void (async () => {
                  await deleteProject(projectToDelete.id);
                  setProjects((prev) => prev.filter((project) => project.id !== projectToDelete.id));
                  if (selectedProject?.id === projectToDelete.id) {
                    setSelectedProject(null);
                  }
                  setProjectToDelete(null);
                })();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsPage;
