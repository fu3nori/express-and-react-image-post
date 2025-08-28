// src/pages/Top.tsx
import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { signInWithGoogle, auth } from "../lib/firebase";

export default function Top() {
    const nav = useNavigate();
    const loc = useLocation() as any;
    const from = loc.state?.from?.pathname || "/me";

    const [user, loading] = useAuthState(auth as any);
    useEffect(() => {
        if (!loading && user) {
            nav(from, { replace: true });
        }
    }, [loading, user, from, nav]);

    async function onGoogle() {
        try {
            await signInWithGoogle();
            nav(from, { replace: true });
        } catch (e) {
            console.error(e);
            alert("ログインに失敗しました。");
        }
    }

    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">PolySeed(β)</h1>
            <p className="mb-6">3DCG Gallery</p>

            <div className="flex gap-3 flex-wrap">
                <div className="left text-center">
                    <button type="button" onClick={onGoogle} className="px-4 py-2 border rounded default-color">
                        Googleでログイン
                        <br />
                        <img src="/image/login.png" alt="login" />
                    </button>
                    <br />
                </div>

                <div className="left text-center">
                    <button type="button" onClick={onGoogle} className="px-4 py-2 border rounded default-color">
                        Googleでサインアップ
                        <br />
                        <img src="/image/sign_up.png" alt="sign up" />
                    </button>
                    <br />
                </div>

                <div className="left text-center">
                    <Link to="/works"  >
                        <button className="custom-button top-10">作品を閲覧する</button>
                    </Link>
                </div>

                <div className="clear"></div>
            </div>
        </main>
    );
}
