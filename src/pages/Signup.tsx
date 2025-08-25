import { Link } from "react-router-dom";

export default function Signup() {
    return (
        <main className="p-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">アカウント作成</h2>
            <p className="mb-2">今夜は簡易版：Google での作成に対応しています。</p>
            <p className="mb-6 text-sm text-gray-600">
                将来は「ハンドルネーム／メール／パスワード／パスワードリマインダー用コード」に対応します。
            </p>
            <Link to="/login" className="px-4 py-2 border rounded">Google で作成する</Link>
            <div className="mt-4">
                <Link to="/">トップへ戻る</Link>
            </div>
        </main>
    );
}
