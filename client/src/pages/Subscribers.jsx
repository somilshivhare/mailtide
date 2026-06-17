import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Upload, Trash2, Mail, ChevronLeft, ChevronRight, Loader2, Users, CheckCircle, AlertTriangle, AlertOctagon, Paperclip, X } from 'lucide-react';
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
  const attachInputRef = useRef(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Custom single email state
  const [sendMailOpen, setSendMailOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [attachments, setAttachments] = useState([]);

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
    mutationFn: ({ id, subject, body, files }) => subscribersAPI.sendDirect(id, subject, body, files),
    onSuccess: () => {
      toast.success('Direct email sent successfully!');
      resetSend();
      setAttachments([]);
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
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Subscribers</h2>
          <p className="text-sm text-muted mt-0.5">Manage your contacts, segments, and CSV imports.</p>
        </div>
        <div className="flex gap-2">
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
            size="sm"
            disabled={importing}
            className="gap-1.5"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Subscriber
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats?.total || 0, icon: Users, color: 'text-accent', bg: 'bg-accent/8' },
          { label: 'Active', value: stats?.active || 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success-bg' },
          { label: 'Unsubscribed', value: stats?.unsubscribed || 0, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-bg' },
          { label: 'Bounced', value: stats?.invalid || 0, icon: AlertOctagon, color: 'text-danger', bg: 'bg-danger-bg' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-white shadow-card p-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-text leading-none">{value}</p>
              <p className="text-xs text-muted font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg bg-white shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
            value={search}
            disabled={stats?.total === 0}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
          value={statusFilter}
          disabled={stats?.total === 0}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All contacts</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="invalid">Invalid / Bounced</option>
        </select>
      </div>

      {/* Subscribers Table */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
        {listLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          </div>
        ) : stats?.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-14 w-14 rounded-full bg-gray-100 border border-border flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-gray-300" />
            </div>
            <h3 className="text-sm font-semibold text-text mb-1">No contacts yet</h3>
            <p className="text-xs text-muted mb-5 max-w-xs">
              Add contacts manually or import from a CSV file to start sending campaigns.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add subscriber
              </Button>
              <Button onClick={handleImportClick} variant="outline" size="sm" disabled={importing} className="gap-1.5">
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Import CSV
              </Button>
            </div>
          </div>
        ) : listData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted">No subscribers found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {['Name', 'Email', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className={`px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listData.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text">{sub.name}</td>
                      <td className="px-5 py-3.5 text-muted">{sub.email}</td>
                      <td className="px-5 py-3.5"><Badge variant={sub.status}>{sub.status}</Badge></td>
                      <td className="px-5 py-3.5 text-xs text-muted">{formatDate(sub.createdAt).split(',')[0]}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedSub(sub); setSendMailOpen(true); }}
                            disabled={sub.status !== 'active'}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-accent hover:bg-accent/8 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Send direct email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub._id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger-bg transition-colors"
                            title="Delete subscriber"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface">
                <p className="text-xs text-muted">
                  Page {page} of {pagination.pages} · {pagination.total} subscribers
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pg = i + 1;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${ page === pg ? 'bg-accent text-white' : 'text-muted hover:bg-gray-100' }`}
                      >{pg}</button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="h-7 w-7 p-0">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
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
          setAttachments([]);
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
            body: data.body,
            files: attachments
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
                placeholder={"Hello {{name}},\n\nHere is your custom message..."}
                rows={7}
                {...registerSend('body')}
                className={sendErrors.body ? 'border-danger' : ''}
              />
              {sendErrors.body && <p className="mt-1.5 text-xs text-danger">{sendErrors.body.message}</p>}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Attachments (max 5 files, 10 MB each)</label>
              <input
                type="file"
                ref={attachInputRef}
                multiple
                className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  setAttachments((prev) => {
                    const combined = [...prev, ...newFiles];
                    if (combined.length > 5) {
                      toast.error('Maximum 5 attachments allowed.');
                      return prev;
                    }
                    return combined;
                  });
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => attachInputRef.current?.click()}
                disabled={attachments.length >= 5}
                className="flex items-center gap-2 h-8 px-3 text-xs border border-dashed border-border rounded-lg text-muted hover:text-text hover:border-accent hover:bg-accent/5 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach files
              </button>

              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3 w-3 text-muted shrink-0" />
                        <span className="text-xs text-text truncate">{file.name}</span>
                        <span className="text-[10px] text-muted shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DialogContent>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetSend();
                setAttachments([]);
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
