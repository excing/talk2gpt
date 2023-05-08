// https://api.live.bilibili.com/room/v1/Room/room_init?id=26149818
// or
// https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=94277
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
    let resp = await fetch(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${params.id}`)
    return json(await resp.json());
}
