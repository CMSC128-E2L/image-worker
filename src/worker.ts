export default {
    async fetch(request: Request, env: Env) {
      const url = new URL(request.url);
      const key = url.pathname.slice(1);
  
      switch (request.method) {
        case 'PUT':
          await env.STALS_BUCKET.put(key, request.body);
          return new Response(`Put ${key} successfully!`);
        case 'GET':
          const rpath = key.split("/");
          if(rpath.length == 2){
            const options: R2ListOptions = {
              prefix: rpath[1],
              limit: 2
            }
            const obj = await env.STALS_BUCKET.list(options);
            let list = [];
            for (let index = 0; index < obj.objects.length; index++) {
              const element = obj.objects[index];
              list.push("https://"+url.hostname+"/"+element.key);
            }
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
  
          return new Response(object.body, {
            headers,
          });
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
    },
  };