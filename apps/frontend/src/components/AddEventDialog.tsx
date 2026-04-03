import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";

type EventCategory = "match" | "training" | "meeting" | "other";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRescheduling: boolean;
  newEvent: any;
  teams: any[];
  coaches: any[];
  handleCreateEvent: (data: any) => void;
  handleReschedule: (data: any) => void;
  isPending: boolean;
}

const AddEventDialog: React.FC<AddEventDialogProps> = ({
  open,
  onOpenChange,
  isRescheduling,
  newEvent,
  teams,
  coaches,
  handleCreateEvent,
  handleReschedule,
  isPending
}) => {
  const [formData, setFormData] = useState(newEvent);

  // Sync with prop when dialog opens or newEvent changes externally (e.g. from sidebar)
  useEffect(() => {
    if (open) {
      setFormData(newEvent);
    }
  }, [open, newEvent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays size={20} />
            </div>
            <DialogTitle className="text-foreground">{isRescheduling ? "Reschedule Event" : "Add Event"}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!isRescheduling && (
            <div>
              <Label>Category</Label>
              <div className="flex gap-2 mt-1">
                {(["training", "match"] as EventCategory[]).map((cat) => (
                  <Button
                    key={cat}
                    variant={formData.category === cat ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => setFormData({ ...formData, category: cat })}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{formData.category === "match" ? "Opponent" : "Event Title"}</Label>
            <Input 
              placeholder={formData.category === "match" ? "e.g. Real Madrid" : "e.g. Tactical Drills"} 
              value={formData.category === "match" ? formData.opponent : formData.title}
              onChange={(e) => {
                if (formData.category === "match") setFormData({...formData, opponent: e.target.value});
                else setFormData({...formData, title: e.target.value});
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Team</Label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.teamId}
                onChange={(e) => setFormData({...formData, teamId: e.target.value})}
              >
                <option value="">Select Team</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
            </div>
            {formData.category === "training" && (
              <div>
                <Label>Coach</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.coachId}
                  onChange={(e) => setFormData({...formData, coachId: e.target.value})}
                >
                  <option value="">Select Coach</option>
                  {coaches.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.user?.username || c.id}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input 
                type="time" 
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>End Time (Optional)</Label>
              <Input 
                type="time" 
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
            <div>
              <Label>Type (Optional)</Label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="TECHNICAL">Technical</option>
                <option value="TACTICAL">Tactical</option>
                <option value="PHYSICAL">Physical</option>
                <option value="MENTAL">Mental</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input 
              placeholder="e.g. Home Stadium" 
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={() => isRescheduling ? handleReschedule(formData) : handleCreateEvent(formData)}
              disabled={isPending}
            >
              {isRescheduling ? "Update Event" : "Add Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventDialog;
