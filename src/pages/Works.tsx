import { Link } from "react-router-dom";

export default function Works() {
    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4">作品一覧（スタブ）</h2>
            <p className="mb-4">ここにフィード（最新順）が入ります。今はスタブ。</p>
            <Link to="/">トップへ戻る</Link>
        </main>
    );
}
