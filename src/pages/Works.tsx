import { useEffect, useMemo, useState } from "react";
import { db, storage } from "../lib/firebase";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
type Artwork = {
    id: string;
    title: string;
    caption: string;
    tags: string[];
    viewPath: string;
    thumbPath: string;
    createdAt: any;
};

const PAGE_SIZE = 20;

export default function Works() {
    const [items, setItems] = useState<Artwork[]>([]);
    const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [thumbURLs, setThumbURLs] = useState<Record<string, string>>({});

    const [sp, setSp] = useSearchParams();
    const tagQuery = (sp.get("tags") || "").trim();       // "tag1 tag2"
    const kw = (sp.get("q") || "").trim();

    const tags = useMemo(() => tagQuery ? tagQuery.split(/\s+/).slice(0,10) : [], [tagQuery]);

    useEffect(() => {
        // パラメータ変更でリロード
        load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagQuery, kw]);

    async function load(reset = false) {
        setLoading(true);
        try {
            const base = collection(db, "artworks");

            let qRef;
            if (tags.length > 0) {
                // AND検索：最初の1件は array-contains、残りは後でクライアントでフィルタ
                qRef = query(base, where("tags", "array-contains", tags[0]), orderBy("createdAt","desc"), limit(PAGE_SIZE));
            } else if (kw) {
                const toks = buildQueryTokens(kw);
                if (toks.length > 0) {
                    qRef = query(base, where("searchTokens","array-contains-any", toks), orderBy("createdAt","desc"), limit(PAGE_SIZE));
                } else {
                    qRef = query(base, orderBy("createdAt","desc"), limit(PAGE_SIZE));
                }
            } else {
                qRef = query(base, orderBy("createdAt","desc"), limit(PAGE_SIZE));
            }

            const snap = await getDocs(reset ? qRef : query(qRef, startAfter(cursor || 0)));
            let docs = snap.docs;
            let list = docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Artwork[];

            // 複数タグのANDはクライアント側で絞り込み
            if (tags.length > 1) {
                list = list.filter(a => tags.every(t => a.tags?.includes(t)));
            }

            // サムネURLを取得
            const urlMap: Record<string,string> = {};
            await Promise.all(list.map(async a => {
                const url = await getDownloadURL(ref(storage, a.thumbPath));
                urlMap[a.id] = url;
            }));
            setThumbURLs(prev => ({...prev, ...urlMap}));

            setItems(reset ? list : [...items, ...list]);
            setCursor(docs.length > 0 ? docs[docs.length-1] : cursor);
            setHasMore(docs.length === PAGE_SIZE);
        } finally {
            setLoading(false);
        }
    }

    function onSearch(e: React.FormEvent) {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const tagsInput = (form.elements.namedItem("tags") as HTMLInputElement).value.trim();
        const q = (form.elements.namedItem("q") as HTMLInputElement).value.trim();
        const next = new URLSearchParams();
        if (tagsInput) next.set("tags", tagsInput);
        if (q) next.set("q", q);
        setItems([]); setCursor(null); setHasMore(false);
        setSp(next, { replace: true });
    }

    return (
        <main className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold mb-4">作品一覧</h2>

            <form onSubmit={onSearch} className="flex flex-wrap gap-2 mb-4">
                <input name="tags" defaultValue={tagQuery} className="border rounded px-3 py-2" placeholder="タグ（空白区切り・AND）" />
                <input name="q" defaultValue={kw} className="border rounded px-3 py-2" placeholder="キーワード（タイトル/キャプション/タグ 部分一致）" />
                <button type="submit" className="px-4 py-2 border rounded">検索</button>
                <Link to="/works" className="px-4 py-2 border rounded">クリア</Link>
            </form>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {items.map(a => (
                    <article key={a.id} className="border rounded-xl p-3">
                        <Link to={`/art/${a.id}`}>
                            {thumbURLs[a.id]
                                ? <img src={thumbURLs[a.id]} alt="" style={{width:"100%",height:180,objectFit:"cover",borderRadius:12}}/>
                                : <div style={{width:"100%",height:180,background:"#eee",borderRadius:12}}/>}
                        </Link>
                        <div className="mt-2 font-semibold line-clamp-2">{a.title}</div>
                        <Link to={`/art/${a.id}`} className="text-sm underline">詳細を見る</Link>
                    </article>
                ))}
            </div>

            <div className="mt-4">
                {hasMore && <button disabled={loading} onClick={()=>load(false)} className="px-4 py-2 border rounded">{loading ? "読込中..." : "もっと見る"}</button>}
            </div>
        </main>
    );
}

function buildQueryTokens(q: string): string[] {
    const s = q.toLowerCase().trim();
    const grams = new Set<string>();
    // 英数字単語
    s.split(/\W+/).filter(Boolean).forEach(w => {
        grams.add(w);
        for (let i=0;i<w.length-1;i++) grams.add(w.slice(i,i+2));
        for (let i=0;i<w.length-2;i++) grams.add(w.slice(i,i+3));
    });
    // 全体N-gram（日本語）
    for (let i=0;i<s.length-1;i++) grams.add(s.slice(i,i+2));
    for (let i=0;i<s.length-2;i++) grams.add(s.slice(i,i+3));
    return Array.from(grams).slice(0, 10); // array-contains-any は最大10件
}
