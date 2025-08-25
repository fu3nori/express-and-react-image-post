import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const [user, loading] = useAuthState(auth as any);
    const loc = useLocation();

    if (loading) return <div className="p-4">Loading...</div>;
    if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;

    return children;
}
