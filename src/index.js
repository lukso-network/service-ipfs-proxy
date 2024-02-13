import { Pico } from "@picojs/pico";
import { cors } from "./utils";
import { mountUpload } from "./ipfs/upload";
import { mountDownload } from "./ipfs/download";

// create a router object, `new` is not needed
export const router = Pico();

router.options("*", async () => {
  return new Response("OK", {
    headers: cors,
  });
});

mountUpload(router);
mountDownload(router);

router.all("*", async () => {
  return new Response("Not found", { status: 404, headers: cors });
});

export default {
  fetch: (req, env, ctx) => router.fetch(req, { ...env, ctx }),
};
