export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    try {
      const url = new URL(request.url);
      let key = url.pathname.slice(1);

      switch (request.method) {
        case 'PUT':
          await env.STALS_BUCKET.put(key, request.body);
          return new Response(`Put ${key} successfully!`);
        case 'GET':
          // Construct the cache key from the cache URL
          const cacheKey = new Request(url.toString(), request);
          const cache = caches.default;

          // Check whether the value is already available in the cache
          // if not, you will need to fetch it from R2, and store it in the cache
          // for future access
          let response = await cache.match(cacheKey);

          if (response) {
            console.log(`Cache hit for: ${request.url}.`);
            return response;
          }

          const rpath = key.split("/");
          // api/v2/id/filename
          if (rpath.length === 4) {
            key = rpath[2] + "/" + rpath[3];
          }

          if (rpath.length == 2) {
            let options: R2ListOptions = {
              prefix: rpath[1],
            }
            switch (rpath[0]) {
              case "getOne":
                options.limit = 1;
                break;
              case "getAll":
                break;
            }

            const obj = await env.STALS_BUCKET.list(options);
            let list: string[] = [];
            obj.objects.forEach(element => {
              list.push("https://" + url.hostname + "/api/v2/" + element.key);
            });
            const res = new Response(JSON.stringify(list));
            return res;
          }
          const object = await env.STALS_BUCKET.get(key);

          if (object === null) {
            return new Response('Object Not Found', { status: 404 });
          }

          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);

          const GETImageResponse = new Response(object.body, {
            headers,
          });

          context.waitUntil(cache.put(cacheKey, GETImageResponse.clone()));

          return GETImageResponse;
        case 'DELETE':
          await env.STALS_BUCKET.delete(key);
          return new Response('Deleted!');

        default:
          return new Response('Method Not Allowed', {
            status: 405,
            headers: {
              Allow: 'PUT, GET, DELETE',
            },
          });
      }
    } catch (e: unknown) {
      return new Response('Error thrown ' + e);
    }
  },
};