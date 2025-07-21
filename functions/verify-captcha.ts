// functions/verify-captcha.ts

// Cloudflare Pages Functions の環境変数は `env` オブジェクトを通じてアクセス可能
interface Env {
  YOUR_TURNSTILE_SECRET_KEY: string; 
}

// onRequest ハンドラは Pages Functions の標準的なエントリポイントです
// `context` オブジェクトには `request`, `env`, `params`, `waitUntil` などが含まれます
export default {
  async onRequest(context: EventContext<Env, string, Record<string, string>>): Promise<Response> {
    const { request, env } = context; 

    // POST リクエストのみを処理
    if (request.method === "POST") {
      const secretKey = env.YOUR_TURNSTILE_SECRET_KEY; 

      // シークレットキーが環境変数に設定されているかを確認
      if (!secretKey) {
        console.error("サーバー設定エラー: 環境変数 'YOUR_TURNSTILE_SECRET_KEY' が設定されていません。");
        return new Response("サーバー設定エラー: シークレットキーが不正または不足しています。", { status: 500 });
      }

      try {
        // クライアントから送信されたフォームデータ（Turnstileトークンを含む）を取得
        const formData = await request.formData();
        const token = formData.get("cf-turnstile-response"); 

        if (!token) {
          console.warn("Turnstileトークンが不足しています。(クライアント側エラー)");
          return new Response("認証に必要な情報が不足しています。再試行してください。", { status: 400 });
        }

        // クライアントのIPアドレスを取得（セキュリティのためにTurnstileに送信推奨）
        const ip = request.headers.get("CF-Connecting-IP");

        // Cloudflare Turnstile の検証エンドポイント
        const verifyUrl = "https://challenges.cloudflare.com/cdn-cgi/challenge-platform/v1/turnstile/verify";

        // Turnstile 検証リクエストを送信
        const response = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            // Content-Type は JSON を指定（FormData を直接送らない場合）
            "content-type": "application/json", 
          },
          body: JSON.stringify({
            secret: secretKey,  // あなたのシークレットキー
            response: token,    // クライアントから受け取ったトークン
            remoteip: ip,       // クライアントのIPアドレス (オプションだが推奨)
          }),
        });

        // Turnstile APIからの応答をJSONとして解析
        const data = await response.json();

        if (data.success) {
          // Turnstile検証が成功した場合
          console.log("Turnstile検証成功:", data);

          // 認証成功後、ユーザーを元のページにリダイレクトし、認証済みクッキーを設定
          const oneHour = 60 * 60; // クッキーの有効期限（1時間）
          const referer = request.headers.get('Referer') || '/'; // リファラーがなければルートパスへ

          const redirectResponse = new Response(null, {
            status: 302, // 302 Found (一時的なリダイレクト)
            headers: {
              "Location": referer, // リダイレクト先URL
            },
          });
          // 認証済みを示すクッキーを設定
          redirectResponse.headers.set(
            'Set-Cookie', 
            `captcha_verified=true; Max-Age=${oneHour}; Path=/; HttpOnly; SameSite=Lax; Secure`
          );
          return redirectResponse; // リダイレクト応答を返す

        } else {
          // Turnstile検証が失敗した場合
          console.error("Turnstile検証に失敗しました:", data);
          // エラーコードがあればそれを表示、なければ「不明なエラー」
          const errorReason = data['error-codes'] ? data['error-codes'].join(', ') : '不明なエラー';
          return new Response(`認証エラー: ${errorReason}. もう一度お試しください。`, {
            status: 403, // 403 Forbidden
            headers: { "Content-Type": "text/plain;charset=UTF-8" }
          });
        }
      } catch (e: any) {
        // ネットワークエラーや予期せぬエラーが発生した場合
        console.error("Worker内部で例外が発生しました:", e);
        return new Response(`サーバー内部エラーが発生しました: ${e.message || '不明なエラー'}`, { status: 500 });
      }
    }

    // GETリクエストやその他のメソッドは許可しない (405 Method Not Allowed)
    return new Response("Method Not Allowed", { status: 405 });
  },
};
