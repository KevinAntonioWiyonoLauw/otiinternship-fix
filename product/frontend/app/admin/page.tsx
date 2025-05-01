'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, FileText, Settings } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-400">Welcome to the admin panel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Users</div>
            <p className="text-xs text-gray-400">
              Register new users and manage existing ones
            </p>
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
}