import { useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage, ts } from "../lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { Link, useNavigate } from "react-router-dom";

/** ファイル条件 */
const ACCEPT = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const VIEW_MAX = { w: 1280, h: 1280 };
const THUMB_MAX = { w: 500, h: 500 };

/** 文字数 */
const TITLE_MAX = 140;
const CAPTION_MAX = 1400;
const TAG_MAX_COUNT = 10;
const TAG_MAX_LEN = 20;

export default function UploadArtwork() {
    // ★★★ ここより上に Hook（useState 等）を置かない！★★★
    const [user] = useAuthState(auth as any);
    const nav = useNavigate();
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [title, setTitle] = useState("");
    const [caption, setCaption] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] || null;
        if (!f) { setPreview(null); setFileName(""); return; }
        if (!ACCEPT.includes(f.type)) {
            alert("jpg/jpeg/png のみアップロードできます。");
            e.target.value = "";
            return;
        }
        if (f.size > MAX_FILE_BYTES) {
            alert("ファイルサイズは最大10MBまでです。");
            e.target.value = "";
            return;
        }
        setPreview(URL.createObjectURL(f));
        setFileName(f.name);
    }

    function validateTags(raw: string): string[] {
        const arr = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
        if (arr.length > TAG_MAX_COUNT) throw new Error(`タグは最大 ${TAG_MAX_COUNT} 件までです。`);
        for (const t of arr) if (t.length > TAG_MAX_LEN) throw new Error(`タグ「${t}」が長すぎます（最大 ${TAG_MAX_LEN} 文字）。`);
        return Array.from(new Set(arr));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        const f = fileRef.current?.files?.[0];
        if (!f) { alert("画像ファイルを選択してください。"); return; }

        try {
            setBusy(true); setMsg(null);

            // 入力チェック
            if (title.trim().length === 0) throw new Error("タイトルを入力してください。");
            if (title.length > TITLE_MAX) throw new Error(`タイトルは最大 ${TITLE_MAX} 文字です。`);
            if (caption.length > CAPTION_MAX) throw new Error(`キャプションは最大 ${CAPTION_MAX} 文字です。`);
            const tags = validateTags(tagsText);

            // 画像処理：view(<=1280) & thumb(<=500)
            const img = await readImageFile(f);
            const viewCanvas = resizeToFit(img, VIEW_MAX.w, VIEW_MAX.h);
            const thumbCanvas = resizeToFit(img, THUMB_MAX.w, THUMB_MAX.h);
            const mime = f.type === "image/png" ? "image/png" : "image/jpeg";
            const viewBlob = await canvasToBlob(viewCanvas, mime, 0.92);
            const thumbBlob = await canvasToBlob(thumbCanvas, mime, 0.9);
            if (!viewBlob || !thumbBlob) throw new Error("画像の変換に失敗しました。");

            const artId = newId();
            const ext = mime === "image/png" ? "png" : "jpg";
            const base = `artworks/${user.uid}/${artId}`;

            // original は保存しない仕様
            const viewRef = ref(storage, `${base}/view_1280.${ext}`);
            const thumbRef = ref(storage, `${base}/thumb_500.${ext}`);

            await uploadBytes(viewRef, viewBlob, { contentType: viewBlob.type });
            await uploadBytes(thumbRef, thumbBlob, { contentType: thumbBlob.type });

            // 検索トークン
            const tokens = buildSearchTokens(`${title}\n${caption}\n${tags.join(" ")}`);

            await setDoc(doc(db, "artworks", artId), {
                ownerId: user.uid,
                title: title.trim(),
                caption,
                tags,
                createdAt: ts(),
                updatedAt: ts(),
                likeCount: 0,
                visibility: "public",
                viewPath: viewRef.fullPath,
                thumbPath: thumbRef.fullPath,
                searchTokens: tokens,
                tagsLocked: true
            });

            setMsg("投稿しました。");
            nav("/works");
        } catch (err: any) {
            setMsg(err.message || "投稿に失敗しました。");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">作品を投稿</h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                    <span>タイトル（最大{TITLE_MAX}文字）</span>
                    <br />
                    <input className="border rounded px-3 py-2"
                           value={title} onChange={e=>setTitle(e.target.value)}
                           required maxLength={TITLE_MAX}/>
                    <br />
                    <br />
                </label>

                <label className="flex flex-col gap-1">
                    <span>キャプション（最大{CAPTION_MAX}文字）</span>
                    <br />
                    <textarea className="border rounded px-3 py-2"
                              value={caption} onChange={e=>setCaption(e.target.value)}
                              rows={6} maxLength={CAPTION_MAX}/>
                </label>
                <br />
                <br />
                <label className="flex flex-col gap-1">
                    <span>タグ（最大{TAG_MAX_COUNT}件・各{TAG_MAX_LEN}文字）※空白/カンマ区切り</span>
                    <br />
                    <input className="border rounded px-3 py-2"
                           value={tagsText} onChange={e=>setTagsText(e.target.value)}
                           placeholder="ugfs SF 宇宙"/>
                </label>
                <br />
                <br />
                {/* ファイル選択：カスタムボタン */}
                <div className="flex flex-col gap-1">
                    <span>画像（jpg/jpeg/png・10MBまで）</span>
                    <div className="flex items-center gap-3">
                        <input
                            id="artfile"
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={onFileChange}
                            className="sr-only"
                        />
                        <label htmlFor="artfile" className="btn-upload">ファイルを選択</label>
                        <br />
                        <br />
                        <span className="text-sm text-gray-500">{fileName || "未選択"}</span>
                    </div>
                    <br />
                    {preview && <img src={preview} alt="" style={{width:160,height:160,objectFit:'cover',borderRadius:12}}/>}
                </div>

                <div className="flex gap-3">
                    <button disabled={busy} type="submit" className="px-4 py-2 border rounded">
                        {busy ? "投稿中..." : "投稿する"}
                    </button>
                    <br />
                    <br />
                    <div><Link to="/me" ><button className="custom-button-normal2">マイページに戻る</button></Link></div>
                </div>

                {msg && <div className="text-sm">{msg}</div>}
            </form>
        </main>
    );
}

/* ---------- 画像 & 検索ユーティリティ ---------- */

function readImageFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("画像を読み込めませんでした。"));
            img.src = String(fr.result);
        };
        fr.onerror = () => reject(new Error("ファイルを読み込めませんでした。"));
        fr.readAsDataURL(file);
    });
}
function resizeToFit(img: HTMLImageElement, maxW: number, maxH: number): HTMLCanvasElement {
    const r = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = Math.round(img.width * r), h = Math.round(img.height * r);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c;
}
function canvasToBlob(canvas: HTMLCanvasElement, mime: string, q?: number): Promise<Blob | null> {
    return new Promise(res => canvas.toBlob(res, mime, q));
}
function buildSearchTokens(input: string): string[] {
    const norm = (input || "").toLowerCase().replace(/\s+/g, "");
    const grams = new Set<string>();
    input.toLowerCase().split(/\W+/).filter(Boolean).forEach(w => {
        grams.add(w);
        for (let i=0;i<w.length-1;i++) grams.add(w.slice(i,i+2));
        for (let i=0;i<w.length-2;i++) grams.add(w.slice(i,i+3));
    });
    for (let i=0;i<norm.length-1;i++) grams.add(norm.slice(i,i+2));
    for (let i=0;i<norm.length-2;i++) grams.add(norm.slice(i,i+3));
    return Array.from(grams).slice(0, 200);
}
function newId(): string {
    return globalThis.crypto?.randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}
