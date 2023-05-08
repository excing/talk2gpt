<script lang="ts">
	import { KeepLiveWS, getRoomid } from 'bilibili-live-ws';

	let roomId: number = 26583717;
	let message: string;

	async function start() {
		let resp = await fetch(`/api/bilibili/room/${roomId}`);
		let { data } = await resp.json();
		console.log(data);

		const live: any = new KeepLiveWS(data.room_id);

		live.on('open', () => {
			console.log('已连接直播弹幕服务器');
		});
		live.on('live', () => {
			console.log('已连接直播间');
		});
		live.on('close', () => console.log('已断开与直播弹幕服务器的连接'));
		live.on('heartbeat', (online) => console.log('当前人气值', online));

		// 礼物
		live.on('SEND_GIFT', ({ data: { uid, uname, action, giftName, num, face } }) => {
			console.log('SEND_GIFT', uid, uname, action, giftName, num, face);
		});

		// 弹幕
		live.on('DANMU_MSG', ({ info: [, message, [uid, uname, isOwner /*, isVip, isSvip*/]] }) => {
			console.log('DANMU_MSG', uid, uname, isOwner, message);
		});

		// SC
		live.on('SUPER_CHAT_MESSAGE', (fullData) => {
			console.log('SUPER_CHAT_MESSAGE', fullData);
		});

		live.on('SUPER_CHAT_MESSAGE_JPN', (data) => console.log('SUPER_CHAT_MESSAGE_JPN', data));

		// 舰长
		live.on('USER_TOAST_MSG', (fullData) => {
			console.log('USER_TOAST_MSG', fullData);
		});

		fetch('/api/bilibili/send', {
			method: 'post',
			body: JSON.stringify({
				roomId: roomId,
				message: message,
			})
		});
	}
</script>

<input type="text" bind:value={roomId} placeholder="Room ID"/>
<br />
<input type="text" bind:value={message} placeholder="Your message"/>
<button on:click={start}>开始</button>
