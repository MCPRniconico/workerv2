// public/script.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('captcha-form');

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault(); // デフォルトのフォーム送信を阻止

            const formData = new FormData(form);
            const turnstileResponse = formData.get('cf-turnstile-response');

            if (!turnstileResponse) {
                alert('Turnstileチャレンジを完了してください。');
                return;
            }

            try {
                // /verify-captcha へPOSTリクエストを送信
                // このパスは functions/verify-captcha.ts が担当します
                const response = await fetch('/verify-captcha', {
                    method: 'POST',
                    body: formData, // FormDataを直接送信
                });

                if (response.ok) { // ステータスコードが 200-299 の場合
                    if (response.redirected) {
                        window.location.href = response.url; // リダイレクト先へ移動
                    } else {
                        alert('認証成功しました！');
                        console.log('認証成功！次の処理を実行してください。');
                    }
                } else {
                    const errorText = await response.text();
                    alert('認証に失敗しました: ' + errorText);
                    console.error('API検証失敗:', response.status, errorText);

                    if (typeof turnstile !== 'undefined') {
                        turnstile.reset();
                    }
                }
            } catch (error) {
                console.error('検証中にエラーが発生しました:', error);
                alert('通信エラーが発生しました。インターネット接続を確認し、もう一度お試しください。');
            }
        });
    }
});
