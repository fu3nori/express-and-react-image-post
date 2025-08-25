import { Link } from "react-router-dom";

export default function Top() {
    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">PixSeed</h1>
            <p className="mb-6">pixiv 簡易版・最小実装（今夜の手始め）</p>

            <div className="flex gap-3 flex-wrap">
                <Link to="/login" className="px-4 py-2 border rounded">ログイン</Link>
                <Link to="/signup" className="px-4 py-2 border rounded">アカウント作成</Link>
                <Link to="/works" className="px-4 py-2 border rounded">作品を閲覧する</Link>
            </div>
        </main>
    );
}
