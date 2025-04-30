'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  niu: string;
  nama_lengkap: string;
  division_id: number;
  role: string;
}

interface Division {
  id: number;
  name: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    niu: '',
    nama_lengkap: '',
    division_id: 0,
    role: 'STAFF',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'error',
      });
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/divisions');
      const data = await response.json();
      setDivisions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch divisions',
        variant: 'error',
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
        fetchUsers();
        setNewUser({
          email: '',
          niu: '',
          nama_lengkap: '',
          division_id: 0,
          role: 'STAFF',
        });
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/auth/import-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Users imported successfully',
        });
        fetchUsers();
        setCsvFile(null);
      } else {
        throw new Error('Failed to import users');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import users',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Link href="/divisions">
          <Button variant="outline">Manage Divisions</Button>
        </Link>
      </div>

      <div className="space-y-4 mb-4">
        <div className="flex items-center space-x-4">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleCsvImport} disabled={!csvFile || isLoading}>
            {isLoading ? 'Importing...' : 'Import CSV'}
          </Button>
          <Link href="/templates/user_import_template.csv" download>
            <Button variant="outline">Download Template</Button>
          </Link>
        </div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mb-4">Create New User</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />
            <Input
              placeholder="NIU"
              value={newUser.niu}
              onChange={(e) =>
                setNewUser({ ...newUser, niu: e.target.value })
              }
            />
            <Input
              placeholder="Full Name"
              value={newUser.nama_lengkap}
              onChange={(e) =>
                setNewUser({ ...newUser, nama_lengkap: e.target.value })
              }
            />
            <Select
              value={newUser.division_id.toString()}
              onValueChange={(value) =>
                setNewUser({ ...newUser, division_id: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((division) => (
                  <SelectItem
                    key={division.id}
                    value={division.id.toString()}
                  >
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newUser.role}
              onValueChange={(value) =>
                setNewUser({ ...newUser, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="KADIV">Kadiv</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateUser} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>NIU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.niu}</TableCell>
              <TableCell>{user.nama_lengkap}</TableCell>
              <TableCell>
                {divisions.find((d) => d.id === user.division_id)?.name}
              </TableCell>
              <TableCell>{user.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 