import { Header } from "@/components/Header";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useState } from "react";
import { Plus, User, Phone, MapPin, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Header 
        title="Customers" 
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="sm" 
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        } 
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search customers..." 
          className="pl-10 h-12 rounded-xl bg-card border-border focus:border-primary focus:ring-primary/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : filteredCustomers?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No customers found.</p>
          </div>
        ) : (
          filteredCustomers?.map(customer => (
            <div key={customer.id} className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{customer.name}</h3>
                  <div className="space-y-1 mt-2">
                    {customer.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 mr-2" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mr-2" />
                        {customer.address}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" asChild>
                     <Link href={`/jobs?customerId=${customer.id}`}>Jobs</Link>
                   </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateCustomerDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

function CreateCustomerDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useCreateCustomer();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData, {
      onSuccess: () => {
        setFormData({ name: "", email: "", phone: "", address: "" });
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input 
              id="address" 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
