import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithGoogle } from "../lib/firebase";

export default function Login() {
    const nav = useNavigate();
    const loc = useLocation() as any;
    const from = loc.state?.from?.pathname || "/me";

    async function onGoogle() {
        await signInWithGoogle();
        nav(from, { replace: true });
    }

    return (
        <main className="p-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">ログイン</h2>
            <button onClick={onGoogle} className="px-4 py-2 border rounded w-full mb-4">
                Google でログイン
            </button>
            <p className="text-sm text-gray-500">
                アカウント未作成でも、初回ログイン時にユーザーを自動作成します。
            </p>
            <div className="mt-4">
                <Link to="/">トップへ戻る</Link>
            </div>
        </main>
    );
}
