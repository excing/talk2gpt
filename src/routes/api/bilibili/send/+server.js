import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    let { roomId, message } = await request.json();
    let body = {
        bubble: '0',
        msg: message,
        color: '16777215',
        mode: '1',
        fontsize: '25',
        rnd: '1683542800',
        roomid: roomId,
        csrf: '1ab238090fc834342ae7ddbed1afea5a',
        csrf_token: '1ab238090fc834342ae7ddbed1afea5a'
    }
    const keys = Object.keys(body);
    let form = new FormData();
    for (const key of keys) {
        form.set(key, body[key]);
    }

    let resp = await fetch('https://api.live.bilibili.com/msg/send', {
        method: 'post',
        headers: {
            'cookie': `cookie`,
            'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundarytl3cTsVwPgXUkp6E',
            'referer': 'https://live.bilibili.com/26583717?session_id=8f22484e6263b6e329990b0d02474887_65B3AC21-14AC-4242-953E-49CFF6263606&launch_id=1000216&live_from=71001',
            'origin': 'https://live.bilibili.com',
        },
        body: `
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="bubble"

0
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="msg"

${message}
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="color"

16777215
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="mode"

1
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="fontsize"

25
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="rnd"

1683542800
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="roomid"

${roomId}
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="csrf"

csrf
------WebKitFormBoundarytl3cTsVwPgXUkp6E
Content-Disposition: form-data; name="csrf_token"

csrf_token
------WebKitFormBoundarytl3cTsVwPgXUkp6E--`,
    });

    return json(await resp.json());
}
