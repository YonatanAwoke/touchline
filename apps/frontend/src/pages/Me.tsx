import React, { useEffect } from "react";
import useAuth from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Me: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return <div className="p-8">Loading...</div>;

  if (!user) return null; // redirecting

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="mt-4 space-y-2">
        <div><strong>ID:</strong> {user.id}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Username:</strong> {user.username}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Organization ID:</strong> {String(user.organizationId)}</div>
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => logout()}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Me;
