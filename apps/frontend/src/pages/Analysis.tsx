import React, { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Video,
  Upload,
  Play,
  Cpu,
  Scissors,
  Clock,
  Film,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Clapperboard,
  Trophy,
  Dumbbell,
  Trash2,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING:    { label: "Pending",    icon: <Clock size={12} />,      className: "bg-muted text-muted-foreground border-0" },
  PROCESSING: { label: "Processing", icon: <Loader2 size={12} className="animate-spin" />, className: "bg-blue-500/10 text-blue-500 border-0" },
  COMPLETED:  { label: "Completed",  icon: <CheckCircle size={12} />, className: "bg-primary/10 text-primary border-0" },
  FAILED:     { label: "Failed",     icon: <XCircle size={12} />,    className: "bg-destructive/10 text-destructive border-0" },
  QUEUED:     { label: "Queued",     icon: <AlertCircle size={12} />, className: "bg-accent text-accent-foreground border-0" },
};

function formatDuration(sec?: number | null): string {
  if (!sec) return "--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <Badge className={`flex items-center gap-1 text-[10px] px-2 ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

function useDeleteMutation(url: string, queryKey: string, label: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${url}?id=${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${label} deleted` });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
}

// ─── Video Player Dialog ───────────────────────────────────────────────────────

const VideoPlayerDialog: React.FC<{ video: any | null; clip?: any | null; onClose: () => void }> = ({ video, clip, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const targetVideo = video || clip?.video;
  if (!targetVideo) return null;
  
  // Use HTML5 media fragments to play just the clip duration
  const streamUrl = clip 
    ? `/api/videos/stream/${targetVideo.storagePath}#t=${clip.startSec},${clip.endSec}`
    : `/api/videos/stream/${targetVideo.storagePath}`;

  const title = clip ? (clip.label || "Clip") : targetVideo.originalName;

  return (
    <Dialog open={!!targetVideo} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-black border-border">
        <div className="relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <Video size={14} className="text-white/70" />
              <span className="text-sm font-medium text-white truncate max-w-xs">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {clip ? (
                <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                  {formatDuration(clip.startSec)} – {formatDuration(clip.endSec)}
                </Badge>
              ) : targetVideo.durationSec ? (
                <Badge className="bg-black/60 text-white border-0 text-xs">{formatDuration(targetVideo.durationSec)}</Badge>
              ) : null}
            </div>
          </div>

          {/* Player */}
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            autoPlay
            className="w-full max-h-[70vh] bg-black"
            style={{ aspectRatio: targetVideo.width && targetVideo.height ? `${targetVideo.width}/${targetVideo.height}` : "16/9" }}
          >
            Your browser does not support HTML5 video.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Video Details Dialog ──────────────────────────────────────────────────────

const VideoDetailsDialog: React.FC<{ video: any | null; onClose: () => void }> = ({ video, onClose }) => {
  if (!video) return null;
  return (
    <Dialog open={!!video} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Info size={16} />
            </div>
            <DialogTitle className="text-base">Video Details</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          {[
            { label: "File Name", value: video.originalName },
            { label: "Type", value: video.type },
            { label: "Status", value: video.status },
            { label: "Duration", value: video.durationSec ? formatDuration(video.durationSec) : "Unknown" },
            { label: "Resolution", value: video.width && video.height ? `${video.width} × ${video.height}` : "Unknown" },
            { label: "FPS", value: video.fps ? `${video.fps} fps` : "Unknown" },
            { label: "Uploaded", value: video.createdAt ? format(new Date(video.createdAt), "dd MMM yyyy, HH:mm") : "—" },
            { label: "Linked to", value: video.session?.title || (video.match ? `vs ${video.match.opponent}` : "—") },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Upload Dialog ─────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: any[];
  matches: any[];
  onUploaded: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ open, onOpenChange, sessions, matches, onUploaded }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [linkType, setLinkType] = useState<"session" | "match">("session");
  const [sessionId, setSessionId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [videoType, setVideoType] = useState("OTHER");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file || (!sessionId && !matchId)) return;
    setUploading(true);
    setProgress(10);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", videoType);
      if (linkType === "session" && sessionId) fd.append("sessionId", sessionId);
      if (linkType === "match" && matchId) fd.append("matchId", matchId);

      setProgress(30);
      const res = await fetch("/api/upload/video", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      setProgress(90);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      setProgress(100);
      toast({ title: "Video uploaded successfully" });
      setFile(null);
      setSessionId("");
      setMatchId("");
      setVideoType("OTHER");
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!uploading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Upload size={20} />
            </div>
            <DialogTitle>Upload Video</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors flex flex-col items-center gap-3 py-8 px-4 ${
              drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Film size={22} />
            </div>
            {file ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop video here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV, AVI, MKV, WebM up to 500MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Link to</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["session", "match"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLinkType(t)}
                  className={`flex-1 py-1.5 text-sm font-medium capitalize transition-colors ${
                    linkType === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t === "session" ? "Training Session" : "Match"}
                </button>
              ))}
            </div>
          </div>

          {linkType === "session" ? (
            <div>
              <Label>Training Session</Label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                <option value="">— Select Session —</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title} — {format(new Date(s.date), "dd MMM yyyy")}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <Label>Match</Label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                <option value="">— Select Match —</option>
                {matches.map((m: any) => (
                  <option key={m.id} value={m.id}>vs {m.opponent} — {format(new Date(m.matchDate), "dd MMM yyyy")}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Video Type</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
              <option value="TRAINING">Training</option>
              <option value="MATCH">Match</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || (!sessionId && !matchId) || uploading} className="gap-2">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Video Card ────────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: any;
  onPlay: (v: any) => void;
  onDetails: (v: any) => void;
  onAnalyze: (v: any) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
  analysisJobs: any[];
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay, onDetails, onAnalyze, onDelete, deleting, analysisJobs }) => {
  const latestJob = analysisJobs.find((j: any) => j.videoId === video.id);
  return (
    <Card className="border-border group hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Thumbnail: click to play */}
        <div
          onClick={() => onPlay(video)}
          className="relative flex items-center justify-center h-32 rounded-lg bg-secondary overflow-hidden cursor-pointer group/thumb"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Clapperboard size={28} className="opacity-30 group-hover/thumb:opacity-60 transition-opacity" />
          </div>
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play size={18} fill="currentColor" />
            </div>
          </div>
          {/* Duration badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
            <Clock size={9} /> {formatDuration(video.durationSec)}
          </div>
          {/* Type badge */}
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 bg-black/60 text-white">
              {video.type}
            </span>
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-semibold text-foreground truncate">{video.originalName || "Video"}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <VideoStatusBadge status={video.status} />
            {video.session && (
              <Badge className="bg-accent text-accent-foreground border-0 text-[10px] gap-1">
                <Dumbbell size={9} /> {video.session.title}
              </Badge>
            )}
            {video.match && (
              <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
                <Trophy size={9} /> vs {video.match.opponent}
              </Badge>
            )}
          </div>
          {/* Resolution */}
          {video.width && video.height && (
            <p className="text-[10px] text-muted-foreground mt-1">{video.width} × {video.height}{video.fps ? ` · ${video.fps}fps` : ""}</p>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-1.5 pt-0.5">
          <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7" onClick={() => onPlay(video)}>
            <Play size={11} fill="currentColor" /> Play
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => onDetails(video)}>
            <Info size={11} /> Details
          </Button>
          {!latestJob ? (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-blue-500 border-blue-500/30 hover:bg-blue-500/10" onClick={() => onAnalyze(video)}>
              <Cpu size={11} /> Analyze
            </Button>
          ) : (
            <Badge className={`text-[10px] px-2 self-center ${statusConfig[latestJob.status]?.className}`}>
              {latestJob.status}
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-destructive hover:bg-destructive/10"
            disabled={deleting}
            onClick={() => onDelete(video.id)}
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Analysis Job Row ──────────────────────────────────────────────────────────

const JobRow: React.FC<{ job: any; onDelete: (id: number) => void; deleting: boolean }> = ({ job, onDelete, deleting }) => {
  const isActive = job.status === "QUEUED" || job.status === "PROCESSING";
  // Simulate progress: QUEUED=5%, PROCESSING uses real progress field or estimate
  const progressPct = job.status === "COMPLETED" ? 100
    : job.status === "FAILED" ? 0
    : job.status === "PROCESSING" ? (job.progressPct ?? 0)
    : 5; // QUEUED

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
          <Cpu size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{job.video?.originalName || `Video #${job.videoId}`}</p>
          <p className="text-xs text-muted-foreground">{job.modelVersion} · {job.createdAt ? format(new Date(job.createdAt), "dd MMM yyyy, HH:mm") : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <VideoStatusBadge status={job.status} />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            disabled={deleting}
            onClick={() => onDelete(job.id)}
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </Button>
        </div>
      </div>
      {/* Progress bar */}
      {(isActive || job.status === "COMPLETED" || job.status === "FAILED") && (
        <div className="mt-2 pl-[52px]">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{isActive ? (job.status === "PROCESSING" ? "Processing video…" : "Waiting in queue…") : job.status === "COMPLETED" ? "Analysis complete" : "Analysis failed"}</span>
            <span className="font-semibold">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                job.status === "FAILED" ? "bg-destructive" : job.status === "COMPLETED" ? "bg-primary" : "bg-blue-500"
              } ${isActive ? "animate-pulse" : ""}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Clip Row ──────────────────────────────────────────────────────────────────

const ClipRow: React.FC<{ clip: any; onPlay: (c: any) => void; onDelete: (id: number) => void; deleting: boolean }> = ({ clip, onPlay, onDelete, deleting }) => (
  <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 hover:bg-secondary/20 px-2 rounded-lg transition-colors">
    <div 
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors group"
      onClick={() => onPlay(clip)}
    >
      <Play size={16} className="text-primary group-hover:text-primary-foreground ml-0.5" fill="currentColor" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{clip.label || "Untitled Clip"}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {clip.video?.originalName} · {formatDuration(clip.startSec)} – {formatDuration(clip.endSec)}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {(clip.tags || []).slice(0, 2).map((t: string) => (
        <Badge key={t} className="text-[9px] border-border bg-secondary text-secondary-foreground">{t}</Badge>
      ))}
      <Badge className="text-[9px] border-0 bg-accent text-accent-foreground">{clip.createdBy}</Badge>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 ml-2"
        disabled={deleting}
        onClick={() => onDelete(clip.id)}
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </Button>
    </div>
  </div>
);

// ─── Analyze Dialog ────────────────────────────────────────────────────────────

const AnalyzeDialog: React.FC<{ video: any | null; onClose: () => void; onSuccess: () => void }> = ({ video, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [modelVersion, setModelVersion] = useState("yolov8n");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ videoId: video.id, modelVersion }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to queue analysis");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Analysis job queued!", description: "Processing will begin shortly." });
      onSuccess();
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!video) return null;

  return (
    <Dialog open={!!video} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cpu size={20} />
            </div>
            <DialogTitle>Run AI Analysis</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Video</p>
            <p className="text-sm font-medium text-foreground truncate">{video.originalName}</p>
            {video.durationSec && <p className="text-xs text-muted-foreground mt-0.5">{formatDuration(video.durationSec)} · {video.width && video.height ? `${video.width}×${video.height}` : "Unknown resolution"}</p>}
          </div>
          <div>
            <Label>Model</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={modelVersion} onChange={(e) => setModelVersion(e.target.value)}>
              <option value="yolov8n">YOLOv8n — Fast (lower accuracy)</option>
              <option value="yolov8s">YOLOv8s — Balanced</option>
              <option value="yolov8m">YOLOv8m — Accurate (slower)</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            The AI will detect players, track movements, and generate event clips. Processing time depends on video duration and model size.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Analysis = () => {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);
  const [playingClip, setPlayingClip] = useState<any | null>(null);
  const [detailVideo, setDetailVideo] = useState<any | null>(null);
  const [analyzeTarget, setAnalyzeTarget] = useState<any | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [deletingClipId, setDeletingClipId] = useState<number | null>(null);

  const deleteVideo = useDeleteMutation("/api/videos", "videos", "Video");
  const deleteJob = useDeleteMutation("/api/analysis", "analysis-jobs", "Analysis job");
  const deleteClip = useDeleteMutation("/api/clips", "clips", "Clip");

  const handleDeleteVideo = (id: number) => {
    setDeletingVideoId(id);
    deleteVideo.mutate(id, { onSettled: () => setDeletingVideoId(null) });
  };
  const handleDeleteJob = (id: number) => {
    setDeletingJobId(id);
    deleteJob.mutate(id, { onSettled: () => setDeletingJobId(null) });
  };
  const handleDeleteClip = (id: number) => {
    setDeletingClipId(id);
    deleteClip.mutate(id, { onSettled: () => setDeletingClipId(null) });
  };

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const res = await fetch("/api/videos?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load videos");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["analysis-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/analysis?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load analysis jobs");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: clipsData, isLoading: clipsLoading } = useQuery({
    queryKey: ["clips"],
    queryFn: async () => {
      const res = await fetch("/api/clips?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load clips");
      return res.json();
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches?limit=1000", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
  });

  const videos = videosData?.items ?? [];
  const jobs = jobsData?.items ?? [];
  const clips = clipsData?.items ?? [];
  const sessions = sessionsData?.items ?? [];
  const matches = matchesData?.items ?? [];

  const activeJobs = jobs.filter((j: any) => j.status === "QUEUED" || j.status === "PROCESSING").length;
  const completedJobs = jobs.filter((j: any) => j.status === "COMPLETED").length;

  return (
    <DashboardLayout title="Analysis" subtitle="Video library, AI analysis jobs, and highlight clips">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Videos", value: videos.length, icon: <Video size={16} />, color: "text-primary" },
          { label: "Active Jobs", value: activeJobs, icon: <Cpu size={16} />, color: "text-blue-500" },
          { label: "Completed", value: completedJobs, icon: <CheckCircle size={16} />, color: "text-primary" },
          { label: "Clips", value: clips.length, icon: <Scissors size={16} />, color: "text-accent-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-secondary ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Upload size={14} /> Upload Video
        </Button>
      </div>

      <Tabs defaultValue="videos">
        <TabsList className="bg-secondary/50 mb-4">
          <TabsTrigger value="videos" className="gap-2">
            <Video size={14} /> Videos ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Cpu size={14} /> Analysis Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="clips" className="gap-2">
            <Scissors size={14} /> Clips ({clips.length})
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos">
          {videosLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading videos...
            </div>
          ) : videos.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <Film size={28} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">No videos yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Upload your first match or training video to get started.</p>
                </div>
                <Button onClick={() => setShowUpload(true)} className="gap-2 mt-1">
                  <Upload size={14} /> Upload Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((v: any) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onPlay={setPlayingVideo}
                  onDetails={setDetailVideo}
                  onAnalyze={setAnalyzeTarget}
                  onDelete={handleDeleteVideo}
                  deleting={deletingVideoId === v.id}
                  analysisJobs={jobs}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analysis Jobs Tab */}
        <TabsContent value="jobs">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Analysis Jobs</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["analysis-jobs"] })}>
                <RefreshCw size={12} /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading...
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-10">
                  <Cpu size={28} className="mx-auto text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No analysis jobs yet.</p>
                </div>
              ) : (
                jobs.map((job: any) => (
                  <JobRow key={job.id} job={job} onDelete={handleDeleteJob} deleting={deletingJobId === job.id} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clips Tab */}
        <TabsContent value="clips">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Highlight Clips</CardTitle>
            </CardHeader>
            <CardContent>
              {clipsLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading...
                </div>
              ) : clips.length === 0 ? (
                <div className="text-center py-10">
                  <Scissors size={28} className="mx-auto text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No clips yet. Generated automatically after AI analysis.</p>
                </div>
              ) : (
                clips.map((clip: any) => (
                  <ClipRow key={clip.id} clip={clip} onPlay={setPlayingClip} onDelete={handleDeleteClip} deleting={deletingClipId === clip.id} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VideoPlayerDialog video={playingVideo} clip={playingClip} onClose={() => { setPlayingVideo(null); setPlayingClip(null); }} />
      <VideoDetailsDialog video={detailVideo} onClose={() => setDetailVideo(null)} />
      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        sessions={sessions}
        matches={matches}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ["videos"] })}
      />
      <AnalyzeDialog
        video={analyzeTarget}
        onClose={() => setAnalyzeTarget(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["analysis-jobs"] })}
      />
    </DashboardLayout>
  );
};

export default Analysis;
