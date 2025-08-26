import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, storage, auth, ts } from "../lib/firebase";
import { collection, doc, getDoc, addDoc, runTransaction, increment } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";

type Artwork = {
    id: string;
    ownerId: string;
    title: string;
    caption: string;
    tags: string[];
    viewPath: string;
    likeCount: number;
};

export default function ArtworkView() {
    const { id } = useParams();
    const [user] = useAuthState(auth as any);
    const [art, setArt] = useState<Artwork | null>(null);
    const [url, setUrl] = useState<string>("");
    const [comment, setComment] = useState("");
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (!id) return;
            const snap = await getDoc(doc(db, "artworks", id));
            if (!snap.exists()) return setMsg("作品が見つかりません。");
            const a = { id: snap.id, ...(snap.data() as any) } as Artwork;
            setArt(a);
            const u = await getDownloadURL(ref(storage, a.viewPath));
            setUrl(u);
        })();
    }, [id]);

    async function like() {
        if (!user || !id) return alert("ログインが必要です。");
        const postRef = doc(db, "artworks", id);
        const likeRef = doc(db, `artworks/${id}/likes`, user.uid);
        await runTransaction(db, async trx => {
            const likeSnap = await trx.get(likeRef);
            const postSnap = await trx.get(postRef);
            if (!postSnap.exists()) throw new Error("missing");
            if (!likeSnap.exists()) {
                trx.set(likeRef, { userId: user.uid, createdAt: new Date() });
                trx.update(postRef, { likeCount: increment(1) });
            } else {
                trx.delete(likeRef);
                trx.update(postRef, { likeCount: increment(-1) });
            }
        });
        // カウンタ再読込
        const snap = await getDoc(doc(db, "artworks", id));
        if (snap.exists()) setArt(prev => prev ? ({...prev, likeCount: (snap.data() as any).likeCount}) : prev);
    }

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !id) return alert("ログインが必要です。");
        if (!comment.trim()) return;
        try {
            await addDoc(collection(db, `artworks/${id}/comments`), {
                userId: user.uid,
                content: comment,
                createdAt: ts(),
            });
            setComment("");
            setMsg("コメントを投稿しました。");
        } catch(e:any) {
            setMsg(e.message || "コメント投稿に失敗しました。");
        }
    }

    if (!art) return <main className="p-6 max-w-3xl mx-auto">読み込み中...</main>;

    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-2">{art.title}</h2>
            <div className="mb-3">
                {/* pre表示 */}
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{art.caption}</pre>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {art.tags?.map(t => (
                    <a key={t} href={`/works?tags=${encodeURIComponent(t)}`} className="px-2 py-1 border rounded text-sm">
                        #{t}
                    </a>
                ))}
            </div>

            {url && <img src={url} alt="" style={{width:"100%",height:"auto",borderRadius:12}}/>}

            <div className="mt-4 flex gap-3">
                <button onClick={like} className="px-3 py-2 border rounded">♥ いいね {art.likeCount ?? 0}</button>
                <a className="px-3 py-2 border rounded" href="/works">一覧へ戻る</a>
            </div>

            <section className="mt-6">
                <h3 className="font-semibold mb-2">感想を送る</h3>
                <form onSubmit={submitComment} className="flex flex-col gap-2">
                    <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={4} className="border rounded px-3 py-2"/>
                    <button className="px-3 py-2 border rounded self-start">送信</button>
                </form>
                {msg && <div className="text-sm mt-2">{msg}</div>}
            </section>
        </main>
    );
}
