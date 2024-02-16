import { cors, fetchWithTimeout } from "../utils";
import { Buffer } from "node:buffer";

export function mountDownload(router) {
  router.get("/ipfs/:cid*", async ({ req, env, result }) => {
    const { cid } = result.pathname.groups;
    if (!cid) {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const send = (response) => {
      response.headers.append("Cache-Control", "maxage=3600");
      return response;
    };

    const ipfsResponse = await new Promise((resolve) => {
      let requests;
      const abortAllExcept = (originalRes) => {
        for (const request of requests || []) {
          if (request === originalRes) {
            continue;
          }
          try {
            request.abort();
          } catch {
            // Ignore errors here
          }
        }
      };
      requests = [
        fetchWithTimeout(`https://${env.INFURA_GATEWAY_HOSTNAME}/ipfs/${cid}`, {
          headers: {
            ...req.headers,
            authorization: `Basic ${Buffer.from(
              `${env.INFURA_PROJECT_ID}:${env.INFURA_API_KEY}`
            ).toString("base64")}`,
          },
          timeout: 60000,
        }),
        fetchWithTimeout(`https://${env.PINATA_GATEWAY}/ipfs/${cid}`, {
          headers: {
            ...req.headers,
            "x-pinata-gateway-token": env.PINATA_TOKEN,
          },
          timeout: 60000,
        }),
      ];
      console.log(requests.map((r) => r.abort));
      Promise.all(
        requests.map((originalRes) => {
          return originalRes
            .then((res) => {
              if (res.ok) {
                if (resolve) {
                  resolve(res);
                  resolve = undefined;
                  abortAllExcept(originalRes);
                }
              }
            })
            .catch((error) => {
              return error;
            });
        })
      ).then((errors) => {
        if (resolve) {
          console.log(errors);
          resolve(new Response("Not Found", { status: 404, headers: cors }));
        }
      });
    });
    if (ipfsResponse.status !== 200) {
      return ipfsResponse;
    }
    const headers = {};
    const keys = {};
    for (const [key, value] of ipfsResponse.headers.entries()) {
      headers[key] = value;
      keys[key.toLowerCase()] = key;
    }
    for (const [key, value] of Object.entries(cors)) {
      if (!keys[key.toLowerCase()]) {
        headers[key] = value;
      }
    }
    return send(
      new Response(ipfsResponse.body, {
        status: ipfsResponse.status,
        headers,
      })
    );
  });
}
