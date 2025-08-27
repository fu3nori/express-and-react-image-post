import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage, ts } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type UserDoc = {
    uid: string;
    handleName?: string;
    homepageURL?: string | null;
    avatarURL?: string | null;
};

const ACCEPT = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SRC_W = 1280;
const MAX_SRC_H = 1280;
const MAX_OUT_W = 300;
const MAX_OUT_H = 300;

export default function ProfileEdit() {
    const [user] = useAuthState(auth as any);
    const nav = useNavigate();
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [ud, setUd] = useState<UserDoc | null>(null);
    const [handleName, setHandleName] = useState("");
    const [homepageURL, setHomepageURL] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (!user) return;
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                const d = snap.data() as UserDoc;
                setUd(d);
                setHandleName(d.handleName || "");
                setHomepageURL(d.homepageURL || "");
                setPreview(d.avatarURL || null);
            }
        })();
    }, [user]);

    if (!user) return null;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setBusy(true);
        try {
            let avatarURL: string | null | undefined = ud?.avatarURL;

            const f = fileRef.current?.files?.[0] || null;
            if (f) {
                // 1) 種別チェック
                if (!ACCEPT.includes(f.type)) throw new Error("jpg/jpeg/png のみアップロードできます。");

                // 2) 解像度チェック（1280x1280以内）
                const img = await readImageFile(f);
                if (img.width > MAX_SRC_W || img.height > MAX_SRC_H) {
                    throw new Error(`画像の解像度は最大 ${MAX_SRC_W}×${MAX_SRC_H} です（現在: ${img.width}×${img.height}）。`);
                }

                // 3) 300×300以内へ縮小
                const resized = await resizeToFit(img, MAX_OUT_W, MAX_OUT_H);
                const blob = await canvasToBlob(resized, f.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
                if (!blob) throw new Error("画像の変換に失敗しました。");

                // 4) Storage にアップロード（users/{uid}/avatar_300.jpg|png）
                const ext = f.type === "image/png" ? "png" : "jpg";
                const path = `users/${user.uid}/avatar_300.${ext}`;
                const r = ref(storage, path);
                await uploadBytes(r, blob, { contentType: blob.type });
                avatarURL = await getDownloadURL(r);
            }

            // URLバリデーション（任意）
            const hp = homepageURL.trim();
            if (hp.length > 0) {
                try {
                    const u = new URL(hp);
                    if (!/^https?:$/i.test(u.protocol)) throw new Error();
                } catch {
                    throw new Error("ホームページURLは http(s):// で始まる有効なURLを入力してください。");
                }
            }

            await updateDoc(doc(db, "users", user.uid), {
                handleName: handleName.trim(),
                homepageURL: hp || null,
                ...(avatarURL !== undefined ? { avatarURL } : {}),
                updatedAt: ts(),
            });

            setMsg("プロフィールを更新しました。");
            if (avatarURL) setPreview(avatarURL);
            // ダッシュボードに戻るなら↓
            // nav("/me");
        } catch (e: any) {
            setMsg(e.message || "更新に失敗しました。");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="p-6 max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4">プロフィール編集</h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                    <span>表示用ハンドルネーム</span>
                    <br />
                    <input
                        value={handleName}
                        onChange={(e) => setHandleName(e.target.value)}
                        required
                        className="border rounded px-3 py-2"
                        placeholder="例）Storch"
                    />
                </label>
                <br />
                <label className="flex flex-col gap-1"><br />
                    <span>ホームページURL（任意）</span><br />
                    <input
                        value={homepageURL}
                        onChange={(e) => setHomepageURL(e.target.value)}
                        className="border rounded px-3 py-2"
                        placeholder="https://example.com"
                    />
                </label>
                <br />
                <br />
                <label className="flex flex-col gap-1">
                    <span>プロフィール画像（jpg/jpeg/png、最大1280×1280 → 300px以内に縮小）</span><br />
                    <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" />
                    {preview && (
                        <img
                            src={preview}
                            alt=""
                            style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12 }}
                        />
                    )}
                </label>
                <br />
                <div className="flex gap-3">                <br />
                    <button disabled={busy} type="submit" className="custom-button-normal">
                        {busy ? "更新中..." : "保存する"}
                    </button>
                    <Link to="/me" className="px-4 py-2 border rounded"><button className="custom-button-normal"> ダッシュボードに戻る</button></Link>
                </div>

                {msg && <div className="text-sm">{msg}</div>}
            </form>
        </main>
    );
}

/* ---------- 画像ユーティリティ ---------- */

function readImageFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error("画像を読み込めませんでした。"));
            img.src = String(fr.result);
        };
        fr.onerror = () => reject(new Error("ファイルを読み込めませんでした。"));
        fr.readAsDataURL(file);
    });
}

function resizeToFit(img: HTMLImageElement, maxW: number, maxH: number): HTMLCanvasElement {
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1); // 拡大しない
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}
