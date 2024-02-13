import { verify } from "@tsndr/cloudflare-worker-jwt";
import { cors } from "../utils";

export function mountUpload(router) {
  router.post("/api/v0/add", async ({ req, env }) => {
    let auth = req.headers.get("authorization");
    const url = new URL(req.url);
    if (!auth && url.searchParams.get("token")) {
      auth = `Bearer ${url.searchParams.get("token")}`;
    }
    // If we have both pinata_api_key and pinata_secret_api_key
    // then we'll let pinata figure it out.
    const pinata_api_key = req.headers.get("pinata_api_key");
    const pinata_secret_api_key = req.headers.get("pinata_secret_api_key");
    if (!pinata_api_key || !pinata_secret_api_key) {
      if (!auth) {
        // If there is no authorization then it's no good
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      const [type, token] = auth.split(" ");
      if (type !== "Bearer") {
        // If the type of not "Bearer" then it's no good
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      try {
        // Otherwise let's validate the token.
        const payload = await verify(token, env.JWT_SECRET);
        const { exp } = payload;
        // Tokens cannot be expired or have a duration that's more than
        // 600 seconds into the future.
        if (exp < Date.now() / 1000 || exp - Date.now() / 1000 > 600) {
          // If the token is expired then it's no good
          return new Response("Unauthorized", { status: 401, headers: cors });
        }
        auth = ""; // This is validate, so don't assume custom pinata credentials.
      } catch {
        // Ignore error (either this is an invalid LUKSO token or a pinata JWT)
      }
    }

    let formData;
    if (/stream-channels/.test(req.url)) {
      const content = await req.formData();
      formData = new FormData();
      let file = content.get("file");
      console.log(file);
      if (typeof file === "string") {
        file = new File([file], "file");
      }
      formData.append("file", file);
    }
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: auth
          ? {
              ...(pinata_api_key ? { pinata_api_key } : {}),
              ...(pinata_secret_api_key ? { pinata_secret_api_key } : {}),
              authorization: auth,
            }
          : {
              pinata_api_key: env.PINATA_API_KEY,
              pinata_secret_api_key: env.PINATA_SECRET_API_KEY,
              authorization: `Bearer ${env.PINATA_JWT}`,
            },
        body: formData || (await req.formData()),
      }
    ).catch((error) => {
      console.error(error);
      return new Response(error.message, { status: 500, headers: cors });
    });
    if (response.status !== 200) {
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: cors,
      });
    }
    const headers = {};
    const keys = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
      keys[key.toLowerCase()] = key;
    }
    for (const [key, value] of Object.entries(cors)) {
      if (!keys[key.toLowerCase()]) {
        headers[key] = value;
      }
    }
    const { IpfsHash, ...json } = await response.json();
    return new Response(JSON.stringify({ ...json, IpfsHash, hash: IpfsHash }), {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  });
}
