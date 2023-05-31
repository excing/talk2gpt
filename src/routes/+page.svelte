<script lang="ts">
	import { onMount } from 'svelte';
	import { speechSynthesis } from '$lib/synth';
	import { ChatMessage, ChatRequestBody, chat } from '$lib/openai';
	import { KeepLiveWS } from 'bilibili-live-ws';
	import { MouthSync } from '$lib/mouth';

	// 设置语言
	// 设置说话人
	// 设置 TTS 引擎（本地或 MS EDGE，优先本地）
	// 设置 ASR 引擎（本地或 whisper，优先本地）

	let isStart = false;

	const cubism2Model = '/shizuku/shizuku.model.json';

	let model: any;
	let canvas: any;

	let display = 'none';

	let synth = speechSynthesis;
	let voice: any = {
		Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)',
		ShortName: 'zh-CN-XiaoxiaoNeural',
		Gender: 'Female',
		Locale: 'zh-CN',
		SuggestedCodec: 'audio-24khz-48kbitrate-mono-mp3',
		FriendlyName: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
		Status: 'GA',
		VoiceTag: {
			ContentCategories: ['News', 'Novel'],
			VoicePersonalities: ['Warm']
		}
	};

	let prefixPromptText =
		'你是一个友善且有趣的朋友。请每个回复尽可能的短，多使用成语，最多不超过80字。';
	$: prefixPrompt = new ChatMessage('system', prefixPromptText);

	let requestBody = new ChatRequestBody([], 200, 0.8, true);
	let errMessage: any = '';

	let waitRequestList: ChatMessage[] = [];
	let waitSentenceCount = 0;
	let speaking = false;

	let roomId = 690; // 22044665;

	async function start() {
		isStart = true;

		display = 'flex';

		await displayLive2d();

		await bilibiliLive();
	}

	async function displayLive2d() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			// resizeTo: window,
			width: 550,
			height: 550,
			transparent: true
		});

		PIXI.live2d.config.sound = false;

		model = await PIXI.live2d.Live2DModel.from(cubism2Model, { autoInteract: false });

		model.scale.set(0.4, 0.4);

		app.stage.addChild(model);
	}

	async function bilibiliLive() {
		let resp = await fetch(`/api/bilibili/room/${roomId}`);
		let { data } = await resp.json();

		const live: any = new KeepLiveWS(data.room_id);

		live.on('open', () => {
			console.log('已连接直播弹幕服务器');
		});
		live.on('live', () => {
			console.log('已连接直播间');
		});
		live.on('close', () => console.log('已断开与直播弹幕服务器的连接'));
		live.on('heartbeat', (online: any) => console.log('当前人气值', online));

		// 礼物
		live.on('SEND_GIFT', ({ data: { uid, uname, action, giftName, num, face } }) => {
			// console.log('SEND_GIFT', uid, uname, action, giftName, num, face);
		});

		// 弹幕
		live.on('DANMU_MSG', ({ info: [, message, [uid, uname, isOwner /*, isVip, isSvip*/]] }) => {
			// console.log('DANMU_MSG', uid, uname, isOwner, message);
			waitRequestList[waitRequestList.length] = new ChatMessage('user', message);
			setTimeout(speech, 10);
		});

		// SC
		live.on('SUPER_CHAT_MESSAGE', (fullData) => {
			// console.log('SUPER_CHAT_MESSAGE', fullData);
		});

		live.on('SUPER_CHAT_MESSAGE_JPN', (data) => console.log('SUPER_CHAT_MESSAGE_JPN', data));

		// 舰长
		live.on('USER_TOAST_MSG', (fullData) => {
			// console.log('USER_TOAST_MSG', fullData);
		});
	}

	function speech() {
		console.log('utterance speech: ', speaking, waitSentenceCount);
		if (!speaking && waitSentenceCount === 0) {
			let msg = waitRequestList.shift();
			if (msg) {
				speaking = true;
				requestBody.messages = [prefixPrompt, msg];
				chat(requestBody, chatDelta, chatDone, chatError);
			}
		}
	}

	function chatDelta(text: string) {
		// console.log(text);

		aloud(text);
	}
	function chatDone(text: string) {
		// messages[messages.length - 1] = new ChatMessage('assistant', text);
		// console.log('Chat Done >: ', text);
	}
	function chatError(err: any) {
		errMessage = err;
		console.log(errMessage);
	}

	let mouth = new MouthSync();
	function aloud(text: string) {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = voice.Locale;

		utterance.onstart = (e) => {
			if (e.currentTarget && e.currentTarget instanceof HTMLAudioElement) {
				mouth.mouthValueByAudio(e.currentTarget, (value) => {
					let coreModel = model.internalModel.coreModel;
					coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', value);
				});
			}
		};
		utterance.onend = () => {
			mouth.stop();
			waitSentenceCount--;
			speaking = 0 < waitSentenceCount;
			console.log('utterance end: ', speaking, waitSentenceCount);

			setTimeout(speech, 10);
		};
		waitSentenceCount++;
		synth.speak(utterance, voice);
	}

	onMount(() => {});
</script>

<svelte:head>
	<title>Home</title>
	<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" async></script>
	<script
		src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"
		async
	></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js" async></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js" async></script>
</svelte:head>

<div class="wh-100 center">
	{#if !isStart}
		<div>
			<label>
				Roomid:
				<input type="number" bind:value={roomId} />
			</label>
			<label>
				Prompt:
				<textarea bind:value={prefixPromptText} />
			</label>
			<label>
				<input type="submit" on:click={start} value="Start" />
			</label>
		</div>
	{/if}

	<div class="container wh-100" style:display>
		<canvas bind:this={canvas} />
	</div>
</div>

<style>
	:global(body) {
		width: 100%;
		height: 100vh;
		padding: 0;
		margin: 0;
		background-image: url('/bg.webp');
		background-repeat: no-repeat;
		background-attachment: fixed;
		background-size: cover;
	}

	.wh-100 {
		width: 100%;
		height: 100%;
	}

	.container {
		align-items: end;
		justify-content: center;
	}

	.center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	label {
		display: block;
		color: aliceblue;
	}

	label + label {
		margin-top: 20px;
	}

	input, textarea {
		width: 240px;
		padding: 10px;
		font-size: 16px;
	}

	textarea {
		height: 20vh;
	}
</style>
