'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

const NEXT_PUBLIC_API_URL = 'http://localhost:8000/api';

interface User {
  id: string;
  email: string;
  niu?: string;
  namaLengkap?: string;
}

interface AddUserToDivisionProps {
  divisionId: number;
  onSuccess: () => void;
}

export default function AddUserToDivision({ divisionId, onSuccess }: AddUserToDivisionProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { authenticatedFetch } = useAuthenticatedApi();

  const handleAddUser = async () => {
    if (!email || !role) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Get all users and find the one with matching email
      const usersResponse = await authenticatedFetch(`${NEXT_PUBLIC_API_URL}/users`);
      if (!usersResponse || !usersResponse.success || !usersResponse.users) {
        throw new Error('Failed to fetch users');
      }

      const user = usersResponse.users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('User not found');
      }

      // Then add the user to the division
      const response = await authenticatedFetch(`${NEXT_PUBLIC_API_URL}/divisions/${divisionId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          role,
        }),
      });

      if (!response) {
        throw new Error('Failed to add user');
      }

      if (!response.success) {
        // Handle specific error messages from backend
        if (response.message === 'User not found') {
          throw new Error('Email is not registered in the system');
        } else if (response.message === 'User already in division') {
          throw new Error('User is already a member of this division');
        } else {
          throw new Error(response.message || 'Failed to add user');
        }
      }

      toast({
        title: 'Success',
        description: 'User added to division successfully',
      });

      // Reset form and close dialog
      setEmail('');
      setRole('STAFF');
      setIsOpen(false);
      onSuccess();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1F1F1F] border border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add User to Division</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter the email address of the user you want to add to this division.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-200">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#282828] border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium text-gray-200">
              Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-[#282828] border-gray-700 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F1F1F] border border-gray-800">
                <SelectItem value="STAFF" className="text-white hover:bg-gray-800">
                  Staff
                </SelectItem>
                <SelectItem value="KADIV" className="text-white hover:bg-gray-800">
                  Kadiv
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddUser}
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLoading ? 'Adding...' : 'Add User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}