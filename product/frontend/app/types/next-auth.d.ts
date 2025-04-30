import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    isKadiv: boolean;
    token: string;
    division: string;
    divisionId: number;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    isKadiv: boolean;
    token: string;
    division: string;
    divisionId: number;
  }
}