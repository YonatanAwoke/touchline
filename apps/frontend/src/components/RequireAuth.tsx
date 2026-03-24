import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "@/lib/auth";
import { RippleLoader } from "@/components/ui/ripple-loader";

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center p-8">
        <RippleLoader size="lg" label="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default RequireAuth;
