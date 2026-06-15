import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Upload, Trash2, Mail, ChevronLeft, ChevronRight, Loader2, Users, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { subscribersAPI } from '../services/api.js';
import { Button, Input, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/custom.jsx';
import { formatDate, getErrorMessage } from '../lib/utils.js';

const subscriberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address')
});

const sendFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required')
});

export default function Subscribers() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Custom single email state
  const [sendMailOpen, setSendMailOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);

  // Zod form setup for manual creation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(subscriberSchema)
  });

  // Zod form setup for single sending
  const {
    register: registerSend,
    handleSubmit: handleSendSubmit,
    reset: resetSend,
    formState: { errors: sendErrors }
  } = useForm({
    resolver: zodResolver(sendFormSchema)
  });

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['subscriber-stats'],
    queryFn: subscribersAPI.getStats
  });

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ['subscribers', page, search, statusFilter],
    queryFn: () => subscribersAPI.getAll(page, 10, search, statusFilter),
    keepPreviousData: true
  });

  // Mutations
  const addSubscriberMutation = useMutation({
    mutationFn: ({ name, email }) => subscribersAPI.addOne(name, email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-stats'] });
      toast.success(`Subscriber ${data.email} added successfully!`);
      reset();
      setAddOpen(false);
    },
    onError: (err) => {
      const errorMsg = getErrorMessage(err, 'Failed to add subscriber.');
      toast.error(errorMsg);
    }
  });

  const sendDirectMutation = useMutation({
    mutationFn: ({ id, subject, body }) => subscribersAPI.sendDirect(id, subject, body),
    onSuccess: () => {
      toast.success('Direct email sent successfully!');
      resetSend();
      setSendMailOpen(false);
      setSelectedSub(null);
    },
    onError: (err) => {
      const errorMsg = getErrorMessage(err, 'Failed to send direct email.');
      toast.error(errorMsg);
    }
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: (id) => subscribersAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-stats'] });
      toast.success('Subscriber deleted.');
    },
    onError: () => {
      toast.error('Failed to delete subscriber.');
    }
  });

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file.');
      return;
    }

    setImporting(true);
    try {
      const result = await subscribersAPI.importCSV(file);
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-stats'] });
      toast.success(`CSV Import finished: ${result.imported} imported, ${result.skipped} skipped.`);
      if (result.errors?.length > 0) {
        console.warn('Import errors:', result.errors);
      }
    } catch (err) {
      toast.error('Failed to import CSV.');
    } finally {
      setImporting(false);
      // Reset input value to allow uploading same file
      e.target.value = '';
    }
  };

  const onAddSubmit = (data) => {
    addSubscriberMutation.mutate(data);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this subscriber?')) {
      deleteSubscriberMutation.mutate(id);
    }
  };

  const listData = listRes?.subscribers || [];
  const pagination = listRes?.pagination || { total: 0, pages: 1 };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text">Audience</h2>
          <p className="text-sm text-muted">Manage your contacts and CSV importing.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button
            onClick={handleImportClick}
            variant="outline"
            disabled={importing}
            className="gap-2 border-border"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import contacts
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add contacts
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Total Subscribers</span>
            <p className="mt-1 text-2xl font-bold text-text">{stats?.total || 0}</p>
          </div>
          <Users className="h-5 w-5 text-muted" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Active</span>
            <p className="mt-1 text-2xl font-bold text-success">{stats?.active || 0}</p>
          </div>
          <CheckCircle className="h-5 w-5 text-success/70" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Unsubscribed</span>
            <p className="mt-1 text-2xl font-bold text-warning">{stats?.unsubscribed || 0}</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-warning/70" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Bounced / Invalid</span>
            <p className="mt-1 text-2xl font-bold text-danger">{stats?.invalid || 0}</p>
          </div>
          <AlertOctagon className="h-5 w-5 text-danger/70" />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <Search className="h-4 w-4" />
          </span>
          <Input
            placeholder="Search by name, email, or multiple emails..."
            className="pl-10"
            value={search}
            disabled={stats?.total === 0}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
            value={statusFilter}
            disabled={stats?.total === 0}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All contacts</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="rounded-lg border border-border bg-surface p-6">
        {listLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : stats?.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
            {/* Modern 3D-like Icon emblem */}
            <div className="relative mb-6 flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-b from-[#161622] to-[#0d0d14] border border-[#ffffff15] shadow-premium overflow-hidden group">
              {/* Inner shadow/gradient effects */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-60 rounded-2xl" />
              
              {/* Stacked metallic hexagons to match the screenshot */}
              <svg className="w-14 h-14 transition-transform duration-500 group-hover:scale-110" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Hexagon */}
                <path d="M30 4L52 16.7V42.3L30 55L8 42.3V16.7L30 4Z" fill="url(#hex-grad-1)" stroke="#ffffff10" strokeWidth="1"/>
                {/* Mid Hexagon */}
                <path d="M30 11L46 20.2V38.8L30 48L14 38.8V20.2L30 11Z" fill="url(#hex-grad-2)" stroke="#ffffff15" strokeWidth="1"/>
                {/* Inner Hexagon */}
                <path d="M30 18L40 23.8V35.2L30 41L20 35.2V23.8L30 18Z" fill="url(#hex-grad-3)" stroke="#7c6aff" strokeWidth="1.5" strokeOpacity="0.8"/>
                
                <defs>
                  <linearGradient id="hex-grad-1" x1="30" y1="4" x2="30" y2="55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" stopOpacity="0.03"/>
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0.07"/>
                  </linearGradient>
                  <linearGradient id="hex-grad-2" x1="30" y1="11" x2="30" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" stopOpacity="0.05"/>
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0.12"/>
                  </linearGradient>
                  <linearGradient id="hex-grad-3" x1="30" y1="18" x2="30" y2="41" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c6aff" stopOpacity="0.4"/>
                    <stop offset="1" stopColor="#503eff" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Glowing decorative dot */}
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            </div>

            {/* Header */}
            <h3 className="text-xl font-bold tracking-tight text-text mb-2">No contacts yet</h3>
            
            {/* Description */}
            <p className="text-sm text-muted mb-8 leading-relaxed">
              Add contacts to manage, segment, and reach your audience.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                onClick={() => setAddOpen(true)}
                className="bg-white text-black hover:bg-white/90 font-medium px-5 py-2.5 rounded-lg border border-transparent shadow-sm flex items-center gap-2 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Add contacts
              </Button>
              <Button 
                onClick={handleImportClick}
                variant="outline"
                disabled={importing}
                className="border-border hover:bg-white/5 px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted" />}
                Import contacts
              </Button>
            </div>
          </div>
        ) : listData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted">No subscribers found matching criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listData.map((sub) => (
                  <TableRow key={sub._id}>
                    <TableCell className="font-medium text-text">{sub.name}</TableCell>
                    <TableCell className="text-muted">{sub.email}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted">{formatDate(sub.createdAt).split(',')[0]}</TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedSub(sub);
                          setSendMailOpen(true);
                        }}
                        disabled={sub.status !== 'active'}
                        className="text-muted hover:text-accent hover:bg-accent/10 p-1.5 rounded transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
                        title="Send Custom Email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub._id)}
                        className="text-muted hover:text-danger hover:bg-danger/10 p-1.5 rounded transition-all duration-200"
                        title="Delete Subscriber"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-4">
                <span className="text-xs text-muted">Showing page {page} of {pagination.pages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Subscriber Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogHeader>
          <DialogTitle>Add Subscriber</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onAddSubmit)}>
          <DialogContent className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Subscriber Name</label>
              <Input
                placeholder="e.g. John Doe"
                {...register('name')}
                className={errors.name ? 'border-danger' : ''}
              />
              {errors.name && <p className="mt-1.5 text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="john.doe@example.com"
                {...register('email')}
                className={errors.email ? 'border-danger' : ''}
              />
              {errors.email && <p className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
            </div>
          </DialogContent>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setAddOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addSubscriberMutation.isLoading}>
              {addSubscriberMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Subscriber
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
      {/* Send Custom Email Modal */}
      <Dialog open={sendMailOpen} onOpenChange={(val) => {
        setSendMailOpen(val);
        if (!val) {
          resetSend();
          setSelectedSub(null);
        }
      }}>
        <DialogHeader>
          <DialogTitle>Send Custom Email</DialogTitle>
          {selectedSub && (
            <p className="text-xs text-muted mt-1">To: <span className="text-text font-semibold">{selectedSub.name} ({selectedSub.email})</span></p>
          )}
        </DialogHeader>
        <form onSubmit={handleSendSubmit((data) => {
          sendDirectMutation.mutate({
            id: selectedSub._id,
            subject: data.subject,
            body: data.body
          });
        })}>
          <DialogContent className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Subject Line</label>
              <Input
                placeholder="e.g. Quick update on your account"
                {...registerSend('subject')}
                className={sendErrors.subject ? 'border-danger' : ''}
              />
              {sendErrors.subject && <p className="mt-1.5 text-xs text-danger">{sendErrors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Email Body (HTML/Text)</label>
              <Textarea
                placeholder="Hello {{name}},\n\nHere is your custom message..."
                rows={8}
                {...registerSend('body')}
                className={sendErrors.body ? 'border-danger' : ''}
              />
              {sendErrors.body && <p className="mt-1.5 text-xs text-danger">{sendErrors.body.message}</p>}
            </div>
          </DialogContent>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetSend();
                setSendMailOpen(false);
                setSelectedSub(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sendDirectMutation.isLoading}>
              {sendDirectMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Email
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
