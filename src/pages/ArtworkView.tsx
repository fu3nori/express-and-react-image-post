// src/pages/ArtworkView.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db, storage, auth, ts } from "../lib/firebase";
import {
    collection, doc, getDoc, addDoc,
    setDoc, deleteDoc,
    getCountFromServer, query, orderBy, onSnapshot
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";

type Artwork = {
    id: string;
    ownerId: string;
    title: string;
    caption: string;
    tags: string[];
    viewPath: string;
    likeCount?: number;
};
type Comment = { id: string; userId: string; content: string; createdAt: any };
type UserProfile = { handleName: string; avatarURL?: string | null };
export default function ArtworkView() {
    const { id } = useParams();
    const [user] = useAuthState(auth as any);

    const [art, setArt] = useState<Artwork | null>(null);
    const [url, setUrl] = useState<string>("");
    const [comments, setComments] = useState<Comment[]>([]);
    const [userMap, setUserMap] = useState<Record<string, UserProfile>>({});
    const [comment, setComment] = useState("");
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let unSub = () => {};

        (async () => {
            // 作品読み込み
            const snap = await getDoc(doc(db, "artworks", id));
            if (!snap.exists()) { setMsg("作品が見つかりません。"); return; }
            const a = { id: snap.id, ...(snap.data() as any) } as Artwork;
            setArt(a);

            // 表示用画像URL
            const u = await getDownloadURL(ref(storage, a.viewPath));
            setUrl(u);

            // いいね数の初期値（集計）
            const agg = await getCountFromServer(collection(db, `artworks/${id}/likes`));
            setArt(prev => prev ? ({ ...prev, likeCount: agg.data().count }) : prev);
        })();

        // コメント購読
        const qC = query(collection(db, `artworks/${id}/comments`), orderBy("createdAt", "asc"));
        unSub = onSnapshot(qC, (ss) => {
            setComments(ss.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        });

        return () => unSub();
    }, [id]);
    // コメントの userId から必要なプロフィールだけ取得してキャッシュ
    useEffect(() => {
        const uids = Array.from(new Set(comments.map(c => c.userId).filter(Boolean)));
        const missing = uids.filter(uid => !userMap[uid]);
        if (missing.length === 0) return;
        (async () => {
            const updates: Record<string, UserProfile> = {};
            await Promise.all(missing.map(async (uid) => {
                const s = await getDoc(doc(db, "users", uid));
                if (s.exists()) {
                    const d = s.data() as any;
                    updates[uid] = { handleName: d.handleName || "NoName", avatarURL: d.avatarURL ?? null };
                } else {
                    updates[uid] = { handleName: uid.slice(0, 8) }; // フォールバック
                }
            }));
            setUserMap(prev => ({ ...prev, ...updates }));
        })();
    }, [comments, userMap]);
    async function like() {
        if (!user || !id) { alert("ログインが必要です。"); return; }
        const likeRef = doc(db, `artworks/${id}/likes`, user.uid);
        const likeSnap = await getDoc(likeRef);
        if (!likeSnap.exists()) {
            await setDoc(likeRef, { userId: user.uid, createdAt: ts() });
        } else {
            await deleteDoc(likeRef);
        }
        const agg = await getCountFromServer(collection(db, `artworks/${id}/likes`));
        setArt(prev => prev ? ({ ...prev, likeCount: agg.data().count }) : prev);
    }

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !id) { alert("ログインが必要です。"); return; }
        if (!comment.trim()) return;
        try {
            await addDoc(collection(db, `artworks/${id}/comments`), {
                userId: user.uid,
                content: comment,
                createdAt: ts(),
            });
            setComment("");
            setMsg("コメントを投稿しました。");
        } catch (e: any) {
            setMsg(e.message || "コメント投稿に失敗しました。");
        }
    }

    if (!art) return <main className="p-6 max-w-3xl mx-auto">読み込み中...</main>;

    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-2">{art.title}</h2>

            <div className="mb-3">
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{art.caption}</pre>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {art.tags?.map(t => (
                    <Link key={t} to={`/works?tags=${encodeURIComponent(t)}`} className="px-2 py-1 border rounded text-sm">
                        #{t}
                    </Link>
                ))}
            </div>

            {url && <img src={url} alt="" style={{ width: "100%", height: "auto", borderRadius: 12 }} />}

            <div className="mt-4 flex gap-3">
                <button onClick={like} className="px-3 py-2 border rounded">♥ いいね {art.likeCount ?? 0}</button>
                <br />
                <br />
                <Link className="px-3 py-2 border rounded" to="/works"><button className="custom-button-normal">一覧へ戻る</button></Link>
                <br />
            </div>

            <section className="mt-6">
                <h3 className="font-semibold mb-2">感想を送る</h3>
                <form onSubmit={submitComment} className="flex flex-col gap-2">
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} className="border rounded px-3 py-2" />
                    <br />
                    <br />
                    <button className="px-3 py-2 border rounded self-start">送信</button>
                </form>
                <br />
                <br />
                <p>コメント</p>
                {msg && <div className="text-sm mt-2">{msg}</div>}

                <div className="mt-4 space-y-3">
                    {comments.map(c => (
                        <div key={c.id} className="border rounded-lg p-2">
                            <div className="text-xs text-gray-500">
                                {userMap[c.userId]?.handleName ?? c.userId}
                            </div>
                            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.content}</pre>
                        </div>
                    ))}
                    {comments.length === 0 && <div className="text-sm text-gray-500">まだコメントはありません。</div>}
                </div>
            </section>
        </main>
    );
}
