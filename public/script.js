// public/script.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('captcha-form');

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault(); // デフォルトのフォーム送信を阻止

            const formData = new FormData(form);
            // Turnstileウィジェットが自動的にフォームに cf-turnstile-response という名前でトークンを追加します
            const turnstileResponse = formData.get('cf-turnstile-response');

            if (!turnstileResponse) {
                alert('Turnstileチャレンジを完了してください。');
                return;
            }

            try {
                // Pages Functionのエンドポイント /verify-captcha へPOSTリクエストを送信
                const response = await fetch('/verify-captcha.ts', {
                    method: 'POST',
                    body: formData, // FormDataオブジェクトを直接送信すると、multipart/form-dataとして適切にエンコードされます
                });

                if (response.ok) { // HTTPステータスコードが 200-299 の場合
                    // Pages Functionがリダイレクトを返した場合
                    if (response.redirected) {
                        window.location.href = response.url; // リダイレクト先へ移動
                    } else {
                        // リダイレクトがない場合（例: Pages Functionが単に成功ステータスを返す場合）
                        alert('認証成功しました！');
                        console.log('認証成功！次の処理を実行してください。');
                        // ここで、必要であれば、認証成功後のUI変更やコンテンツ表示ロジックを記述します
                        // 例: form.style.display = 'none'; // フォームを隠す
                        //     document.getElementById('welcome-message').style.display = 'block'; // メッセージを表示
                    }
                } else {
                    // エラーレスポンスの場合
                    const errorText = await response.text(); // サーバーからのエラーメッセージを取得
                    alert('認証に失敗しました: ' + errorText);
                    console.error('API検証失敗:', response.status, errorText);

                    // Turnstileウィジェットをリセットして、ユーザーに再試行を促す (任意)
                    // グローバルな `turnstile` オブジェクトが存在するか確認
                    if (typeof turnstile !== 'undefined') {
                        turnstile.reset();
                    }
                }
            } catch (error) {
                // ネットワークエラーなど、fetchリクエスト自体が失敗した場合
                console.error('通信中にエラーが発生しました:', error);
                alert('通信エラーが発生しました。インターネット接続を確認し、もう一度お試しください。');
            }
        });
    }
});
