import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type UserDoc = {
    uid: string;
    handleName?: string;
    avatarURL?: string | null;
    email?: string | null;
    homepageURL?: string | null;
};

export default function MyPage() {
    const [user] = useAuthState(auth as any);
    const [ud, setUd] = useState<UserDoc | null>(null);

    useEffect(() => {
        (async () => {
            if (!user) return;
            const snap = await getDoc(doc(db, "users", user.uid));
            setUd(snap.exists() ? (snap.data() as UserDoc) : null);
        })();
    }, [user]);

    if (!user) return null;

    return (
        <main className="p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">ダッシュボード</h2>

            <div className="flex items-center gap-4 mb-4">
                {ud?.avatarURL ? (
                    <img
                        src={ud.avatarURL}
                        alt=""
                        style={{ width: 96, height: 96, borderRadius: 12, objectFit: "cover" }}
                    />
                ) : (
                    <div style={{
                        width: 96, height: 96, borderRadius: 12, background: "#eee",
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>No Image</div>
                )}
                <div>
                    <div className="font-semibold">{ud?.handleName || user.displayName || "(no name)"}</div>
                    <div className="text-sm text-gray-600">{ud?.email || user.email}</div>
                    {ud?.homepageURL && (
                        <a className="text-sm underline" href={ud.homepageURL} target="_blank" rel="noreferrer">
                            {ud.homepageURL}
                        </a>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <Link to="/me/profile" className="px-3 py-2 border rounded">プロフィール編集</Link>
                <Link to="/" className="px-3 py-2 border rounded">トップへ</Link>
            </div>
        </main>
    );
}
