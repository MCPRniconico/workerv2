// _worker.js

export default {
    async fetch(request, env, ctx) {
        const TURNSTILE_SECRET_KEY = env.VERIFY_SECRET_KEY ; // Cloudflare Pagesの環境変数で設定

        const url = new URL(request.url);

        // Turnstile検証用のPOSTエンドポイント
        if (request.method === 'POST' && url.pathname === '/verify-access') {
            try {
                const body = await request.json();
                const token = body.token;

                if (!token) {
                    return new Response(JSON.stringify({ success: false, error: 'Token missing' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const formData = new FormData();
                formData.append('secret', TURNSTILE_SECRET_KEY);
                formData.append('response', token);
                formData.append('remoteip', request.headers.get('CF-Connecting-IP'));

                const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
                const result = await fetch(verifyUrl, {
                    body: formData,
                    method: 'POST',
                });

                const outcome = await result.json();

                if (outcome.success) {
                    // 検証成功: 情報ページへリダイレクトするためのJSONを返す
                    return new Response(JSON.stringify({ success: true, redirect: '/info.html' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } else {
                    console.error('Turnstile verification failed:', outcome['error-codes']);
                    return new Response(JSON.stringify({ success: false, error: outcome['error-codes'] }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

            } catch (error) {
                console.error('Worker error during Turnstile verification:', error);
                return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // info.htmlへの直接アクセスをリダイレクト（認証を強制）
        // ユーザーが直接 /info.html にアクセスした場合、認証ページに戻す
        if (url.pathname === '/info.html') {
            return Response.redirect(new URL('/', request.url).toString(), 302); // ルート (index.html) にリダイレクト
        }

        // それ以外のリクエストは、Pagesが提供する通常の静的ファイルとして処理
        return env.ASSETS.fetch(request);
    },
};