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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import AddUserToDivision from './AddUserToDivision';
import { useAuth } from '@/context/AuthContext';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { X, Trash2 } from 'lucide-react';

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DivisionResponse {
  division_id?: number;
  id?: number;
  name: string;
  type: string;
  description: string;
}

interface Division {
  id: number;
  name: string;
  type: string;
  description: string;
}

interface DivisionUser {
  id: string;
  name: string;
  role: string;
}

interface UserDivision {
  id: number;
  name: string;
  type: string;
  description?: string;
  role: string;
}

interface ApiUser {
  id: string;
  user_id?: string;
  namaLengkap?: string;
  name?: string;
  role: string;
}

export default function DivisionManagement() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [filteredDivisions, setFilteredDivisions] = useState<Division[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [divisionUsers, setDivisionUsers] = useState<DivisionUser[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { authenticatedFetch } = useAuthenticatedApi();

  // Fetch divisions on mount
  useEffect(() => {
    fetchDivisions();
  }, []);

  // Fetch users when selected division changes
  useEffect(() => {
    if (selectedDivision) {
      fetchDivisionUsers(selectedDivision.id);
    } else {
      setDivisionUsers([]);
    }
  }, [selectedDivision]);

  useEffect(() => {
    const filtered = divisions.filter(division => 
      division.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      division.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredDivisions(filtered);
  }, [searchQuery, divisions]);

  const fetchDivisions = async () => {
    try {
      console.log('Fetching divisions...');
      const data = await authenticatedFetch(`/api/divisions`);
      console.log('Divisions response:', data);
      
      if (data && data.success && Array.isArray(data.divisions)) {
        console.log('Setting divisions:', data.divisions);
        if (data.divisions.length > 0) {
          console.log('Sample division structure:', data.divisions[0]);
        }
        
        let idCounter = 1;
        const validDivisions = data.divisions
          .map((div: DivisionResponse) => ({
            id: div.division_id || div.id || idCounter++,
            name: div.name,
            type: div.type,
            description: div.description
          }))
          .filter((div: Division) => div.name && div.type);
        
        console.log('Processed divisions:', validDivisions);
        setDivisions(validDivisions);
        setFilteredDivisions(validDivisions);
      } else {
        console.error('Invalid divisions data:', data);
        setDivisions([]);
        setFilteredDivisions([]);
      }
    } catch (error) {
      console.error('Error fetching divisions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch divisions',
        variant: 'error',
      });
      setDivisions([]);
      setFilteredDivisions([]);
    }
  };

  const fetchDivisionUsers = async (divisionId: number) => {
    if (!divisionId) {
      console.error('Invalid division ID:', divisionId);
      return;
    }

    try {
      console.log('Fetching users for division:', divisionId);
      const response = await authenticatedFetch(`/api/divisions/${divisionId}/users?ts=${Date.now()}`);
      console.log('Division users response:', response);
      
      if (response && response.success) {
        let users = [];
        
        if (Array.isArray(response.users)) {
          users = response.users;
        } else if (Array.isArray(response)) {
          users = response;
        }
        
        const formattedUsers = users.map((user: ApiUser) => ({
          id: user.id || user.user_id,
          name: user.namaLengkap || user.name || 'Unknown',
          role: user.role || 'STAFF'
        }));
        
        console.log('Formatted users:', formattedUsers);
        setDivisionUsers(formattedUsers);
      } else {
        console.error('Invalid users data:', response);
        setDivisionUsers([]);
      }
    } catch (error) {
      console.error('Error fetching division users:', error);
      setDivisionUsers([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch division users',
        variant: 'error',
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!selectedDivision || updatingRole === userId) return;

    try {
      console.log('Starting role update for user:', userId, 'new role:', newRole);
      setUpdatingRole(userId);

      const updateResponse = await authenticatedFetch(
        `/api/divisions/${selectedDivision.id}/users/${userId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ role: newRole }),
        }
      );

      console.log('Update response:', updateResponse);

      if (!updateResponse || !updateResponse.success) {
        throw new Error(updateResponse?.message || 'Failed to update role');
      }

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });

      // Refresh the entire page after successful role update
      window.location.reload();

    } catch (error: any) {
      console.error('Role update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'error',
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedDivision) return;

    try {
      const data = await authenticatedFetch(
        `/api/divisions/${selectedDivision.id}/users/${userId}`,
        {
          method: 'DELETE',
        }
      );

      if (data) {
        toast({
          title: 'Success',
          description: 'User removed from division successfully',
        });
        await fetchDivisionUsers(selectedDivision.id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove user',
        variant: 'error',
      });
    }
  };

  const handleViewUsers = (division: Division) => {
    setSelectedDivision(division);
    fetchDivisionUsers(division.id);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="container mx-auto py-8 px-4">
        <div className="flex space-x-4">
          {/* Main content */}
          <div className={`${selectedDivision ? 'w-[60%]' : 'max-w-3xl mx-auto'}`}>
            <div className="mb-6">
              <Input
                placeholder="Search divisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm bg-gray-800 text-white border-gray-700"
              />
            </div>

            <div className="bg-[#0a0a0a] rounded-lg shadow-lg overflow-hidden border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="font-semibold text-gray-300">Name</TableHead>
                    <TableHead className="font-semibold text-gray-300">Type</TableHead>
                    <TableHead className="font-semibold text-gray-300">Description</TableHead>
                    <TableHead className="font-semibold text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDivisions.map((division) => (
                    <TableRow 
                      key={division.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-200">{division.name}</TableCell>
                      <TableCell className="text-gray-300">{division.type}</TableCell>
                      <TableCell className="text-gray-300">{division.description}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleViewUsers(division)}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          size="sm"
                        >
                          View Users
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Side panel for users */}
          {selectedDivision && (
            <div className="w-[40%] bg-[#0a0a0a] rounded-lg shadow-lg p-6 h-fit border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">
                  {selectedDivision.name} Division Users
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDivision(null)}
                  className="h-8 w-8 text-gray-400 hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Add User Button */}
              <div className="mb-4">
                <AddUserToDivision 
                  divisionId={selectedDivision.id} 
                  onSuccess={() => fetchDivisionUsers(selectedDivision.id)} 
                />
              </div>
              
              <div className="space-y-4">
                {divisionUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border border-gray-800 space-y-2 bg-gray-800/50"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-200">{user.name}</span>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                          disabled={updatingRole === user.id}
                        >
                          <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-gray-200">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="STAFF" className="text-gray-200">Staff</SelectItem>
                            <SelectItem value="KADIV" className="text-gray-200">KADIV</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUser(user.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {divisionUsers.length === 0 && (
                  <p className="text-gray-400 text-center py-4">
                    No users in this division
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}