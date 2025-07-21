// functions/verify-captcha.ts

interface Env {
  YOUR_TURNSTILE_SECRET_KEY: string; 
}

export default {
  async onRequest(context: EventContext<Env, string, Record<string, string>>): Promise<Response> {
    const { request, env } = context; 

    if (request.method === "POST") {
      const secretKey = env.YOUR_TURNSTILE_SECRET_KEY; 

      if (!secretKey) {
        console.error("環境変数 'YOUR_TURNSTILE_SECRET_KEY' が設定されていません。");
        return new Response("サーバー設定エラー: シークレットキーが不足しています。", { status: 500 });
      }

      try {
        const formData = await request.formData();
        const token = formData.get("cf-turnstile-response"); 

        if (!token) {
          console.warn("Turnstileトークンが不足しています。(クライアント側エラー)");
          return new Response("Turnstileトークンが不足しています。", { status: 400 });
        }

        const ip = request.headers.get("CF-Connecting-IP");
        const verifyUrl = "https://challenges.cloudflare.com/cdn-cgi/challenge-platform/v1/turnstile/verify";

        const response = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            secret: secretKey,
            response: token,
            remoteip: ip,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const oneHour = 60 * 60;
          const referer = request.headers.get('Referer') || '/';

          const redirectResponse = new Response(null, {
            status: 302,
            headers: {
              "Location": referer,
            },
          });
          redirectResponse.headers.set(
            'Set-Cookie', 
            `captcha_verified=true; Max-Age=${oneHour}; Path=/; HttpOnly; SameSite=Lax; Secure`
          );
          return redirectResponse;

        } else {
          console.error("Turnstile検証に失敗しました:", data);
          const errorReason = data['error-codes'] ? data['error-codes'].join(', ') : '不明なエラー';
          return new Response(`認証エラー: ${errorReason}. もう一度お試しください。`, {
            status: 403,
            headers: { "Content-Type": "text/plain;charset=UTF-8" }
          });
        }
      } catch (e: any) {
        console.error("Worker内部で例外が発生しました:", e);
        return new Response(`サーバー内部エラー: ${e.message || '不明なエラー'}`, { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
