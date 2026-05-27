import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List, Plus, Trash2, Edit2, RotateCcw, Pin } from 'lucide-react';
import { toast } from 'sonner';

// ─── API helper ───────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/admins';

async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || `Request failed (${res.status})`;
    toast.error(message);
    throw new Error(message);
  }
  return res.json();
}

// Safely extract an array from whatever envelope the backend returns.
// Handles: [], { data: [] }, { users/jobs/discussions: [] }, { data: { data: [] } }
function extractArray(res, keys = []) {
  if (Array.isArray(res)) return res;
  for (const key of keys) {
    if (Array.isArray(res[key])) return res[key];
  }
  if (res.data) return extractArray(res.data, keys);
  return [];
}

function extractTotal(res, arr) {
  return res.total ?? res.totalCount ?? res.pagination?.total ?? arr.length;
}

function extractTotalPages(res, arr, limit) {
  return res.totalPages ?? res.pagination?.totalPages ?? Math.ceil(extractTotal(res, arr) / limit);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex items-center justify-center gap-2 mt-4">
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
    >
      Previous
    </Button>
    <div className="flex gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next
    </Button>
  </div>
);

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', role: '' });
  const [editForm, setEditForm] = useState({});
  const itemsPerPage = 5;

  // GET /api/admin/users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
      });
      const data = await apiFetch(`/users?${params}`);
      const arr = extractArray(data, ['users', 'data']);
      setUsers(arr);
      setTotalPages(extractTotalPages(data, arr, itemsPerPage));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [currentPage, searchTerm]);

  // DELETE /api/admin/users/:id  (soft-delete)
  const deleteUser = async (id) => {
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // PATCH /api/admin/users/:id/suspend
  const toggleSuspend = async (user) => {
    try {
      await apiFetch(`/users/${user._id ?? user.id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ suspend: !user.isSuspended }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle suspend:', err);
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName ?? user.name,
      email: user.email,
      role: user.role,
      isSuspended: user.isSuspended ?? user.status === 'Inactive',
    });
    setIsEditDialogOpen(true);
  };

  // PATCH /api/admin/users/:id
  const saveEdit = async () => {
    try {
      await apiFetch(`/users/${selectedUser._id ?? selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const statusBadge = (user) => {
    const active = !user.isSuspended && (user.status !== 'Inactive');
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>

          {/* Add User Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                <Select onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
                {/* Note: user creation via admin route isn't defined in the provided routes;
                    wire to your own POST /api/admin/users or auth signup endpoint */}
                <Button className="w-full" onClick={() => setIsAddDialogOpen(false)}>
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading users…</p>
      ) : viewMode === 'table' ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id ?? user.id}>
                  <TableCell>{user.fullName ?? user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{statusBadge(user)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {/* PATCH /api/admin/users/:id/suspend */}
                      <Button size="sm" variant="outline" onClick={() => toggleSuspend(user)}>
                        {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </Button>
                      {/* DELETE /api/admin/users/:id */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.fullName ?? user.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogAction onClick={() => deleteUser(user._id ?? user.id)}>Delete</AlertDialogAction>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card key={user._id ?? user.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{user.fullName ?? user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm"><strong>Role:</strong> <span className="capitalize">{user.role}</span></div>
                  <div className="text-sm"><strong>Status:</strong> <span className="ml-2">{statusBadge(user)}</span></div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => openEdit(user)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => toggleSuspend(user)}>
                      {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.fullName ?? user.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction onClick={() => deleteUser(user._id ?? user.id)}>Delete</AlertDialogAction>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Edit User Dialog — PATCH /api/admin/users/:id */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editForm.fullName ?? ''}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              placeholder="Full Name"
            />
            <Input
              value={editForm.email ?? ''}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Email"
              type="email"
            />
            <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editForm.isSuspended ? 'inactive' : 'active'}
              onValueChange={(v) => setEditForm({ ...editForm, isSuspended: v === 'inactive' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={saveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

const JobsTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newJob, setNewJob] = useState({ title: '', client: '', budget: '', category: '' });
  const itemsPerPage = 5;

  // GET /api/admin/jobs
  const fetchJobs = async (includeDeleted = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(includeDeleted && { includeDeleted: true }),
      });
      const data = await apiFetch(`/jobs?${params}`);
      const arr = extractArray(data, ['jobs', 'data']);
      setJobs(arr);
      setTotalPages(extractTotalPages(data, arr, itemsPerPage));
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [currentPage, searchTerm]);

  // DELETE /api/admin/jobs/:id
  const deleteJob = async (id) => {
    try {
      await apiFetch(`/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  // POST /api/admin/jobs/:id/restore
  const restoreJob = async (id) => {
    try {
      await apiFetch(`/jobs/${id}/restore`, { method: 'POST' });
      fetchJobs();
    } catch (err) {
      console.error('Failed to restore job:', err);
    }
  };

  const openEdit = (job) => {
    setSelectedJob(job);
    setEditForm({
      title: job.title,
      budget: job.budget,
      category: job.category,
      status: job.status,
    });
    setIsEditDialogOpen(true);
  };

  // PATCH /api/admin/jobs/:id
  const saveEdit = async () => {
    try {
      await apiFetch(`/jobs/${selectedJob._id ?? selectedJob.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setIsEditDialogOpen(false);
      fetchJobs();
    } catch (err) {
      console.error('Failed to update job:', err);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>

          {/* Add Job Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Job</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Job</DialogTitle>
                <DialogDescription>Create a new job posting</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Job Title"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                />
                <Input
                  placeholder="Client Name"
                  value={newJob.client}
                  onChange={(e) => setNewJob({ ...newJob, client: e.target.value })}
                />
                <Input
                  placeholder="Budget"
                  value={newJob.budget}
                  onChange={(e) => setNewJob({ ...newJob, budget: e.target.value })}
                />
                <Select onValueChange={(v) => setNewJob({ ...newJob, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
                {/* Wire to your job-creation endpoint */}
                <Button className="w-full" onClick={() => setIsAddDialogOpen(false)}>Create Job</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading jobs…</p>
      ) : viewMode === 'table' ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job._id ?? job.id} className={job.isDeleted ? 'opacity-50' : ''}>
                  <TableCell>{job.title}</TableCell>
                  <TableCell>{job.client?.fullName ?? job.client}</TableCell>
                  <TableCell>{job.budget}</TableCell>
                  <TableCell className="capitalize">{job.category}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor(job.status)}`}>{job.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(job)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {job.isDeleted ? (
                        /* POST /api/admin/jobs/:id/restore */
                        <Button size="sm" variant="outline" onClick={() => restoreJob(job._id ?? job.id)}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        /* DELETE /api/admin/jobs/:id */
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Job</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => deleteJob(job._id ?? job.id)}>Delete</AlertDialogAction>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card key={job._id ?? job.id} className={job.isDeleted ? 'opacity-50' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>{job.client?.fullName ?? job.client}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm"><strong>Budget:</strong> {job.budget}</div>
                  <div className="text-sm"><strong>Category:</strong> <span className="capitalize">{job.category}</span></div>
                  <div className="text-sm">
                    <strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${statusColor(job.status)}`}>{job.status}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => openEdit(job)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    {job.isDeleted ? (
                      <Button size="sm" className="flex-1" variant="outline" onClick={() => restoreJob(job._id ?? job.id)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Restore
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Job</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogAction onClick={() => deleteJob(job._id ?? job.id)}>Delete</AlertDialogAction>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Edit Job Dialog — PATCH /api/admin/jobs/:id */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editForm.title ?? ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Job Title"
            />
            <Input
              value={editForm.budget ?? ''}
              onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
              placeholder="Budget"
            />
            <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={saveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Forum / Discussions Tab ──────────────────────────────────────────────────

const ForumTab = () => {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForum, setSelectedForum] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', category: '', isPinned: false });
  const itemsPerPage = 5;

  // GET /api/admin/discussions
  const fetchForums = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
      });
      const data = await apiFetch(`/discussions?${params}`);
      const arr = extractArray(data, ['discussions', 'data']);
      setForums(arr);
      setTotalPages(extractTotalPages(data, arr, itemsPerPage));
    } catch (err) {
      console.error('Failed to fetch discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForums(); }, [currentPage, searchTerm]);

  // DELETE /api/admin/discussions/:id
  const deleteForum = async (id) => {
    try {
      await apiFetch(`/discussions/${id}`, { method: 'DELETE' });
      fetchForums();
    } catch (err) {
      console.error('Failed to delete discussion:', err);
    }
  };

  // POST /api/admin/discussions/:id/restore
  const restoreForum = async (id) => {
    try {
      await apiFetch(`/discussions/${id}/restore`, { method: 'POST' });
      fetchForums();
    } catch (err) {
      console.error('Failed to restore discussion:', err);
    }
  };

  // PATCH /api/admin/discussions/:id/pin
  const togglePin = async (id) => {
    try {
      await apiFetch(`/discussions/${id}/pin`, { method: 'PATCH' });
      fetchForums();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const openEdit = (forum) => {
    setSelectedForum(forum);
    setEditForm({
      title: forum.title,
      category: forum.category,
      isClosed: forum.isClosed ?? forum.status === 'Closed',
      isPinned: forum.isPinned ?? false,
    });
    setIsEditDialogOpen(true);
  };

  // PATCH /api/admin/discussions/:id
  const saveEdit = async () => {
    try {
      await apiFetch(`/discussions/${selectedForum._id ?? selectedForum.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setIsEditDialogOpen(false);
      fetchForums();
    } catch (err) {
      console.error('Failed to update discussion:', err);
    }
  };

  // POST /api/admin/discussions
  const createDiscussion = async () => {
    try {
      await apiFetch('/discussions', {
        method: 'POST',
        body: JSON.stringify(newDiscussion),
      });
      setIsAddDialogOpen(false);
      setNewDiscussion({ title: '', content: '', category: '', isPinned: false });
      fetchForums();
    } catch (err) {
      console.error('Failed to create discussion:', err);
    }
  };

  const statusColor = (forum) => {
    if (forum.isDeleted) return 'bg-gray-100 text-gray-800';
    if (forum.status === 'Flagged') return 'bg-red-100 text-red-800';
    if (forum.isClosed || forum.status === 'Closed') return 'bg-gray-100 text-gray-800';
    return 'bg-green-100 text-green-800';
  };

  const statusLabel = (forum) => {
    if (forum.isDeleted) return 'Deleted';
    if (forum.status) return forum.status;
    if (forum.isClosed) return 'Closed';
    return 'Active';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Search discussions..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>

          {/* Add Discussion — POST /api/admin/discussions */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Discussion</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Discussion</DialogTitle>
                <DialogDescription>Start a new forum discussion</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Discussion Title"
                  value={newDiscussion.title}
                  onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                />
                <Input
                  placeholder="Content"
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                />
                <Select onValueChange={(v) => setNewDiscussion({ ...newDiscussion, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tips">Tips</SelectItem>
                    <SelectItem value="qa">Q&A</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={createDiscussion}>Create Discussion</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading discussions…</p>
      ) : viewMode === 'table' ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forums.map((forum) => (
                <TableRow key={forum._id ?? forum.id} className={forum.isDeleted ? 'opacity-50' : ''}>
                  <TableCell className="flex items-center gap-1">
                    {forum.isPinned && <Pin className="w-3 h-3 text-blue-500" />}
                    {forum.title}
                  </TableCell>
                  <TableCell>{forum.author?.fullName ?? forum.author}</TableCell>
                  <TableCell className="capitalize">{forum.category}</TableCell>
                  <TableCell>{forum.replies ?? forum.repliesCount ?? 0}</TableCell>
                  <TableCell>{forum.views ?? 0}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor(forum)}`}>
                      {statusLabel(forum)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(forum)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {/* PATCH /api/admin/discussions/:id/pin */}
                      <Button size="sm" variant="outline" onClick={() => togglePin(forum._id ?? forum.id)}>
                        <Pin className={`w-4 h-4 ${forum.isPinned ? 'text-blue-500' : ''}`} />
                      </Button>
                      {forum.isDeleted ? (
                        /* POST /api/admin/discussions/:id/restore */
                        <Button size="sm" variant="outline" onClick={() => restoreForum(forum._id ?? forum.id)}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        /* DELETE /api/admin/discussions/:id */
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Discussion</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogAction onClick={() => deleteForum(forum._id ?? forum.id)}>Delete</AlertDialogAction>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forums.map((forum) => (
              <Card key={forum._id ?? forum.id} className={forum.isDeleted ? 'opacity-50' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-1">
                    {forum.isPinned && <Pin className="w-4 h-4 text-blue-500" />}
                    {forum.title}
                  </CardTitle>
                  <CardDescription>{forum.author?.fullName ?? forum.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm"><strong>Category:</strong> <span className="capitalize">{forum.category}</span></div>
                  <div className="text-sm"><strong>Replies:</strong> {forum.replies ?? forum.repliesCount ?? 0}</div>
                  <div className="text-sm"><strong>Views:</strong> {forum.views ?? 0}</div>
                  <div className="text-sm">
                    <strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${statusColor(forum)}`}>
                      {statusLabel(forum)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => openEdit(forum)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => togglePin(forum._id ?? forum.id)}>
                      <Pin className={`w-4 h-4 ${forum.isPinned ? 'text-blue-500' : ''}`} />
                    </Button>
                    {forum.isDeleted ? (
                      <Button size="sm" className="flex-1" variant="outline" onClick={() => restoreForum(forum._id ?? forum.id)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Restore
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Discussion</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogAction onClick={() => deleteForum(forum._id ?? forum.id)}>Delete</AlertDialogAction>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Edit Discussion — PATCH /api/admin/discussions/:id */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Discussion</DialogTitle>
            <DialogDescription>Update discussion information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editForm.title ?? ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Discussion Title"
            />
            <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tips">Tips</SelectItem>
                <SelectItem value="qa">Q&A</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editForm.isClosed ? 'closed' : 'active'}
              onValueChange={(v) => setEditForm({ ...editForm, isClosed: v === 'closed' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={saveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

const StatsBar = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // GET /api/admin/stats
    apiFetch('/stats')
      .then((res) => setStats(res.data ?? res))
      .catch((err) => console.error('Failed to fetch stats:', err));
  }, []);

  if (!stats) return null;

  const items = [
    { label: 'Total Users', value: stats.totalUsers ?? '—' },
    { label: 'Active Jobs', value: stats.activeJobs ?? '—' },
    { label: 'Discussions', value: stats.totalDiscussions ?? '—' },
    { label: 'Pending Verifications', value: stats.pendingVerifications ?? '—' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage users, jobs, and forum discussions</p>
        </div>

        {/* GET /api/admin/stats */}
        <StatsBar />

        <Card>
          <CardHeader>
            <CardTitle>Freelancer Platform Management</CardTitle>
            <CardDescription>View and manage all platform content</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="jobs">Jobs</TabsTrigger>
                <TabsTrigger value="forum">Forum</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
              <TabsContent value="jobs" className="mt-6"><JobsTab /></TabsContent>
              <TabsContent value="forum" className="mt-6"><ForumTab /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}