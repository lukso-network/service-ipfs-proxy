# service-ipfs-proxy

This is a IPFS proxy

# To deploy

Use wrangler to deploy, deploy secrets as per .dev.env.sample
It's a simple pico router which could also be deployed using fastify or
express, but then the environment would need to passed differently.

# Requests

## `GET /ipfs/:cid*`

Return content from IPFS gateways.

## `POST /api/v0/add`

> upload API used by extension and other frontend apps, but will also work with pinata. There is currently no good way to upload from client side without exposing credentials.

Upload and Pin IPFS file. Uses formdata with a field called 'file' containing the file blob.
Additional fields are possible per pinata, but we don't currently need or use them.
Protected:

- Use with short term token created with a shared secret contained in either a Bearer token or token= query.
- pinata headers containing pinata_api_key and pinata_secret_api_key
- Passing a valid pinata JWT through either Bearer token or token= query.
  The shared secrets uses normal jwt sign()
