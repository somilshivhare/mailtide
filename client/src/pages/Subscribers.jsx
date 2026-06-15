import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Upload, Trash2, ChevronLeft, ChevronRight, Loader2, Users, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { subscribersAPI } from '../services/api.js';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/custom.jsx';
import { formatDate } from '../lib/utils.js';

const subscriberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address')
});

export default function Subscribers() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  // Zod form setup for manual creation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(subscriberSchema)
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
      const errorMsg = err.response?.data?.error || 'Failed to add subscriber.';
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
          <h2 className="text-2xl font-bold tracking-tight text-text">Subscribers</h2>
          <p className="text-sm text-muted">Manage your mailing lists and CSV importing.</p>
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
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subscriber
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
            placeholder="Search by name or email..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
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
                    <TableCell className="text-right">
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
    </div>
  );
}
