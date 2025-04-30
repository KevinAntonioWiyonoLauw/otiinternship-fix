'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getAuthToken } from '@/lib/auth';

interface DivisionResponse {
  name: string;
  type: string;
  description: string;
  id: number;         // The database ID
  division_id: number; // Same as id for consistency
}

interface Division {
  id: number;
  name: string;
  type: string;
  description: string;
}

const RegisterPage = () => {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    niu: '',
    nama_lengkap: '',
    division_id: '',
    role: 'STAFF'
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Check if user is KADIV
  React.useEffect(() => {
    if (!user || !hasRole('KADIV')) {
      router.push('/dashboard');
      toast.error("Only KADIV can access this page");
    }
  }, [user, hasRole, router]);

  // Fetch divisions
  React.useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/divisions`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Divisions response:', data);
          if (data.success && Array.isArray(data.divisions)) {
            // Sort divisions by name for better usability
            const sortedDivisions = [...data.divisions].sort((a, b) => a.name.localeCompare(b.name));
            
            const validDivisions = sortedDivisions
              .filter((div: DivisionResponse) => div && div.name && div.id)
              .map((div: DivisionResponse): Division => ({
                id: div.id,
                name: div.name,
                type: div.type || 'TECHNICAL',
                description: div.description || ''
              }));
              
            console.log('Mapped divisions:', validDivisions);
            setDivisions(validDivisions);
          } else {
            console.error('Invalid divisions data:', data);
            setDivisions([]);
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch divisions:', errorData);
          setDivisions([]);
        }
      } catch (error) {
        console.error('Error fetching divisions:', error);
        setDivisions([]);
      }
    };
    fetchDivisions();
  }, []);

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = getAuthToken();

    try {
      // Find the selected division
      const selectedDivisionId = formData.division_id;
      const selectedDivision = divisions.find(div => String(div.id) === selectedDivisionId);
      
      if (!selectedDivision) {
        toast.error('Please select a valid division');
        setIsLoading(false);
        return;
      }

      // Log the exact division being sent for debugging
      console.log('Sending registration with division:', selectedDivision);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          niu: formData.niu,
          nama_lengkap: formData.nama_lengkap,
          division_id: selectedDivision.id, // Direct use of the ID from the API
          role: formData.role
        })
      });
      const data = await response.json();
      console.log('Register response:', data);
      
      if (response.ok && data.success) {
        toast.success(`User ${formData.nama_lengkap} (${formData.email}) has been registered successfully`);
        setFormData({
          email: '',
          niu: '',
          nama_lengkap: '',
          division_id: '',
          role: 'STAFF'
        });
      } else {
        // Handle specific error messages from the API
        if (data.error && data.error.includes('Email already registered')) {
          toast.error('Email sudah terdaftar. Silakan gunakan email lain.');
        } else if (data.error && data.error.includes('NIU already registered')) {
          toast.error('NIU sudah terdaftar. Silakan gunakan NIU lain.');
        } else if (data.error && data.error.includes('Invalid division')) {
          toast.error('Divisi tidak valid. Silakan pilih divisi yang benar.');
        } else if (data.error && data.error.includes('Invalid role')) {
          toast.error('Role tidak valid. Silakan pilih role yang benar.');
        } else {
          toast.error(data.message || 'Gagal mendaftarkan user. Silakan cek form dan coba lagi.');
        }
      }
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.message.includes('Failed to fetch')) {
        toast.error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
      } else {
        toast.error(error.message || 'Terjadi kesalahan tak terduga. Silakan coba lagi nanti.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Silakan pilih file CSV untuk diimport");
      return;
    }
    setIsLoading(true);
    const token = getAuthToken();
    console.log('CSV Import Token:', token); // Debug log
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/import-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      
      // Check if the import was actually successful
      if (response.ok && data.success) {
        toast.success("User berhasil diimport dari file CSV");
        setCsvFile(null);
      } else {
        // Handle specific error messages from the API
        if (data.error) {
          if (data.error.includes('Email already registered')) {
            toast.error('Email sudah terdaftar dalam file CSV.');
          } else if (data.error.includes('NIU already registered')) {
            toast.error('NIU sudah terdaftar dalam file CSV.');
          } else if (data.error.includes('Invalid division')) {
            toast.error('Divisi tidak valid dalam file CSV.');
          } else if (data.error.includes('Invalid CSV format')) {
            toast.error('Format CSV tidak valid. Pastikan format sesuai dengan template.');
          } else {
            toast.error(data.error || 'Gagal mengimport user. Silakan cek format file CSV dan coba lagi.');
          }
        } else if (data.message) {
          toast.error(data.message);
        } else {
          toast.error('Gagal mengimport user. Silakan coba lagi.');
        }
      }
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        toast.error('Tidak dapat terhubung ke server. Silakan coba lagi nanti.');
      } else {
        toast.error(error.message || 'Terjadi kesalahan tak terduga saat mengimport user. Silakan coba lagi nanti.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !hasRole('KADIV')) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="border border-gray-600 rounded-lg shadow-md bg-[#18181b]">
        <CardHeader>
          <CardTitle>User Registration</CardTitle>
          <CardDescription>Register new users manually or import from CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Registration</TabsTrigger>
              <TabsTrigger value="csv">Import CSV</TabsTrigger>
            </TabsList>
            {/* Separator */}
            <div className="my-4 border-b border-gray-700" />
            <TabsContent value="manual">
              <form onSubmit={handleManualRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="border border-gray-600 rounded bg-[#232326]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niu">NIU</Label>
                  <Input
                    id="niu"
                    value={formData.niu}
                    onChange={(e) => setFormData({ ...formData, niu: e.target.value })}
                    required
                    className="border border-gray-600 rounded bg-[#232326]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nama_lengkap">Full Name</Label>
                  <Input
                    id="nama_lengkap"
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                    required
                    className="border border-gray-600 rounded bg-[#232326]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Select
                    value={formData.division_id}
                    onValueChange={(value) => {
                      console.log('Selected division value:', value);
                      setFormData({ ...formData, division_id: value });
                    }}
                  >
                    <SelectTrigger className="w-full border border-gray-600 rounded bg-[#232326]">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-[#232326] max-h-[300px] overflow-y-auto border border-gray-600 rounded shadow-lg z-50"
                      align="center"
                      side="bottom"
                      position="popper"
                      sideOffset={5}
                    >
                      {divisions.map((division) => (
                        <SelectItem 
                          key={division.id} 
                          value={String(division.id)} 
                          className="px-4 py-2 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                        >
                          {division.name} - {division.type} (ID: {division.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="border border-gray-600 rounded bg-[#232326]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#232326] max-h-40 w-56 divide-y divide-gray-700">
                      <SelectItem value="STAFF" className="bg-[#232326] px-4 py-2 border-b border-gray-700">Staff</SelectItem>
                      <SelectItem value="KADIV" className="bg-[#232326] px-4 py-2">KADIV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register User
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="csv">
              <form onSubmit={handleCsvImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv">Upload CSV File</Label>
                  <Input
                    id="csv"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="border border-gray-600 rounded bg-[#232326]"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  CSV format should include: email, niu, nama_lengkap, division
                </p>
                <Button type="submit" disabled={isLoading || !csvFile} className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import CSV
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;