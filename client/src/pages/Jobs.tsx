import { useJobs, useCreateJob } from "@/hooks/use-jobs";
import { useCustomers } from "@/hooks/use-customers";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addDays
} from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const selectedDateJobs = jobs?.filter(job => 
    job.scheduledDate && isSameDay(new Date(job.scheduledDate), selectedDate)
  ) || [];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-[#F8F5F2] pb-32">
      {/* Header */}
      <div className="px-6 pt-12 mb-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Calendar</h1>
            <p className="text-[#666666]">{format(currentDate, "MMMM yyyy")}</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="icon" 
            className="bg-primary hover:bg-primary/90 text-white rounded-full h-12 w-12 shadow-lg shadow-primary/20"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-black/5 mb-8">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="font-bold text-lg">{format(currentDate, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-[#999999] py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const hasJobs = jobs?.some(job => job.scheduledDate && isSameDay(new Date(job.scheduledDate), day));

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative aspect-square flex items-center justify-center cursor-pointer rounded-full transition-all",
                    isSelected ? "bg-primary text-white font-bold" : "hover:bg-black/5",
                    !isCurrentMonth && !isSelected && "text-[#CCCCCC]"
                  )}
                >
                  <span className="text-sm">{format(day, "d")}</span>
                  {hasJobs && !isSelected && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline / Agenda */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1 mb-4">
            <h3 className="text-xl font-bold text-[#1A1A1A]">
              {isSameDay(selectedDate, new Date()) ? "Today's Schedule" : format(selectedDate, "EEEE, MMM d")}
            </h3>
            <span className="text-sm font-medium text-[#666666] bg-white px-3 py-1 rounded-full shadow-sm border border-black/5">
              {selectedDateJobs.length} {selectedDateJobs.length === 1 ? 'Job' : 'Jobs'}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : selectedDateJobs.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-black/10 rounded-3xl p-12 text-center text-[#999999]">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No jobs scheduled</p>
              <p className="text-sm">Tap the + to add a job</p>
            </div>
          ) : (
            selectedDateJobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 hover:border-primary/30 transition-all group cursor-pointer active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FFF1EB] flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] group-hover:text-primary transition-colors">{job.title}</h4>
                        <p className="text-xs text-[#999999] font-medium">
                          {job.scheduledDate ? format(new Date(job.scheduledDate), "h:mm a") : "TBD"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#CCCCCC] group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="space-y-2 pl-1">
                    {job.customerId && <CustomerName id={job.customerId} />}
                    <p className="text-sm text-[#666666] line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <CreateJobDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        defaultDate={format(selectedDate, "yyyy-MM-dd")} 
      />
    </div>
  );
}

function CustomerName({ id }: { id: number }) {
  const { data: customers } = useCustomers();
  const customer = customers?.find(c => c.id === id);
  if (!customer) return null;
  return (
    <div className="flex items-center text-xs font-bold text-[#8B7E74] bg-[#F0EEEB] w-fit px-2 py-1 rounded-lg border border-[#E5E2DE]">
      <User className="w-3 h-3 mr-1.5" />
      {customer.name}
    </div>
  );
}

function CreateJobDialog({ open, onOpenChange, defaultDate }: { open: boolean, onOpenChange: (open: boolean) => void, defaultDate: string }) {
  const { mutate, isPending } = useCreateJob();
  const { data: customers } = useCustomers();
  const [formData, setFormData] = useState({ title: "", description: "", customerId: "", scheduledDate: defaultDate, time: "09:00" });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledDate = new Date(`${formData.scheduledDate}T${formData.time}`);

    mutate({
      title: formData.title,
      description: formData.description,
      customerId: formData.customerId ? parseInt(formData.customerId) : undefined,
      scheduledDate: scheduledDate,
      status: "scheduled"
    }, {
      onSuccess: () => {
        setFormData({ title: "", description: "", customerId: "", scheduledDate: defaultDate, time: "09:00" });
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">New Schedule Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="font-bold">Job Title</Label>
            <Input 
              required
              placeholder="e.g. Fix leaky faucet"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="rounded-xl h-12 border-black/10"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="font-bold">Customer</Label>
            <Select 
              value={formData.customerId} 
              onValueChange={v => setFormData({...formData, customerId: v})}
            >
              <SelectTrigger className="rounded-xl h-12 border-black/10">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Date</Label>
              <Input 
                type="date"
                value={formData.scheduledDate}
                onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                className="rounded-xl h-12 border-black/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Time</Label>
              <Input 
                type="time"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="rounded-xl h-12 border-black/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Notes</Label>
            <Textarea 
              placeholder="Any details to remember..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl min-h-[100px] border-black/10"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save to Schedule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
