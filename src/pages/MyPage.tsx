import { useAuthState } from "react-firebase-hooks/auth";
import { auth, logout } from "../lib/firebase";

export default function MyPage() {
    const [user] = useAuthState(auth as any);

    return (
        <main className="p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">マイページ（スタブ）</h2>
            {user && (
                <div className="space-y-2">
                    <div>UID: {user.uid}</div>
                    <div>DisplayName: {user.displayName}</div>
                    <div>Email: {user.email}</div>
                    <button onClick={logout} className="px-4 py-2 border rounded">ログアウト</button>
                </div>
            )}
        </main>
    );
}
