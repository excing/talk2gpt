<script lang="ts">
	import { onMount, beforeUpdate, afterUpdate } from 'svelte';
	import { speechSynthesis } from '$lib/synth';
	import { ChatMessage, ChatRequestBody, chat } from '$lib/openai';
	import { MouthSync } from '$lib/mouth';
	import { speechRecognition, whisper } from '$lib/audio';
	import { getRecordFile } from '$lib/audio';
	import { encode } from '@beskar-labs/gpt-encoder';

	var displayMediaOptions: DisplayMediaStreamOptions = {
		video: true,
		audio: true,
		selfBrowserSurface: 'include',
		preferCurrentTab: true,
		systemAudio: 'include'
	};

	const cubism2Model = '/shizuku/shizuku.model.json';

	let model: any;
	let canvas: any;

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

	let prefixPromptText = '你是一个友善的助手，每个回复不得超过 80 个字';
	let endPrompt = '我很满意你的服务';
	let preEndSpeech = false;

	$: prefixPrompt = new ChatMessage('system', prefixPromptText);

	let usedGptTokenLen = 0;
	let maxGptTokenLen = 4000;
	let maxChatTokenLen = 2000;
	$: usableTokenLen = maxGptTokenLen = maxChatTokenLen;
	let requestBody = new ChatRequestBody([], maxChatTokenLen, 0.8, true);
	let errMessage: any = '';

	let allMessageList: ChatMessage[] = [];
	let waitSentenceCount = 0;
	let speaking = false;

	let chatDeltaMessage = new ChatMessage('system', '');

	let isDisplayCanvas = false;

	let isWhisper = false;
	$: asr = isWhisper ? whisper : speechRecognition;

	let recorder: MediaRecorder | null = null;

	let chatsContainer: any;
	let autoscroll = false;

	beforeUpdate(() => {
		if (chatsContainer) {
			const scrollableDistance = chatsContainer.scrollHeight - chatsContainer.offsetHeight;
			autoscroll = chatsContainer.scrollTop > scrollableDistance - 30;
		}
	});

	afterUpdate(() => {
		if (autoscroll) {
			chatsContainer.scrollTo(0, chatsContainer.scrollHeight);
		}
	});

	async function start() {
		isDisplayCanvas = true;

		if (await displayLive2d()) {
			await handleRecord();
			speech();
		}
	}

	// https://stackoverflow.com/questions/64717758/merge-two-audio-tracks-into-one-track/65356064#65356064
	function margeAudioTrack(audioTrack1: MediaStreamTrack, audioTrack2: MediaStreamTrack) {
		let OutgoingAudioMediaStream = new MediaStream();
		OutgoingAudioMediaStream.addTrack(audioTrack1);

		let IncomingAudioMediaStream = new MediaStream();
		IncomingAudioMediaStream.addTrack(audioTrack2);

		const audioContext = new AudioContext();

		let audioIn_01 = audioContext.createMediaStreamSource(OutgoingAudioMediaStream);
		let audioIn_02 = audioContext.createMediaStreamSource(IncomingAudioMediaStream);

		let dest = audioContext.createMediaStreamDestination();

		audioIn_01.connect(dest);
		audioIn_02.connect(dest);

		let FinalStream = dest.stream;

		return FinalStream;
	}

	async function handleRecord() {
		const displayMedia = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
		const userMedia = await navigator.mediaDevices.getUserMedia({
			video: false,
			audio: true
		});
		const finalStream = margeAudioTrack(
			displayMedia.getAudioTracks()[0],
			userMedia.getAudioTracks()[0]
		);
		finalStream.addTrack(displayMedia.getVideoTracks()[0]);

		const _recorder = new MediaRecorder(finalStream);
		const chunks: Blob[] = [];

		_recorder.ondataavailable = (e) => chunks.push(e.data);
		_recorder.onstop = () => {
			displayMedia.getTracks().forEach((track) => {
				track.stop();
				displayMedia.removeTrack(track);
			});
			userMedia.getTracks().forEach((track) => {
				track.stop();
				userMedia.removeTrack(track);
			});

			const file = getRecordFile(chunks, _recorder.mimeType);
			const url = URL.createObjectURL(file);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.name;
			link.click();
		};

		_recorder.start();

		recorder = _recorder;
	}

	function speech() {
		new Audio('/speech_start.mp3').play();
		asr(
			speechRecognitionStart,
			speechRecognitionDelta,
			speechRecognitionDone,
			speechRecognitionError
		);
	}
	function speechRecognitionStart() {
		console.log('Speech recognition start');
		
		// messages[messages.length] = new ChatMessage('user', '');
	}
	function speechRecognitionDelta(text: string) {
		// messages[messages.length - 1] = new ChatMessage('user', text);
		chatDeltaMessage = new ChatMessage('user', text);
	}
	function speechRecognitionDone(text: string) {
		console.log('Speech Done >: ', text);
		chatDeltaMessage = new ChatMessage('user', text);

		allMessageList[allMessageList.length] = new ChatMessage('user', text);
		if (-1 < text.indexOf(endPrompt)) {
			preEndSpeech = true;
		}
		let len = 0;
		let tempArr = [];
		for (let i = allMessageList.length - 1; 0 <= i; i--) {
			let msg = allMessageList[i];
			// let tokenLen = encode(msg.content).length;
			len += encode(msg.content).length;
			if (usableTokenLen < len) {
				break;
			}
			tempArr.unshift(msg);
		}
		usedGptTokenLen += len;
		new Audio('/speech_stop.mp3').play();
		requestBody.messages = [prefixPrompt, ...tempArr];
		console.log(requestBody);

		chat(requestBody, chatDelta, chatDone, chatError);
	}
	function speechRecognitionError(event: any) {
		// event: SpeechRecognitionErrorEvent
		errMessage = `Speech recognition error detected: ${event.error}`;
		if (event.message) {
			errMessage += `\nAdditional information: ${event.message}`;
		}
	}

	/*
	  阅读下面的材料，根据要求写作。（60分）

  人们因技术发展得以更好地掌控时间，但也有人因此成了时间的仆人。

  这句话引发了你怎样的联想与思考？请写一篇文章。

  要求：选准角度，确定立意，明确文体，自拟标题；不要套作，不得抄袭；不得泄露个人信息；不少于800字。
	*/
	async function displayLive2d() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			width: 550,
			height: 550,
			transparent: true
		});

		try {
			PIXI.live2d.config.sound = false;

			model = await PIXI.live2d.Live2DModel.from(cubism2Model, { autoInteract: false });
		} catch (error) {
			errMessage = error;
			return false;
		}

		model.scale.set(0.4, 0.4);

		app.stage.addChild(model);

		return true;
	}

	function chatDelta(text: string) {
		aloud(text);
	}
	function chatDone(text: string) {
		console.log('Chat Done >: ', text);
		usedGptTokenLen += encode(text).length;
		allMessageList[allMessageList.length] = new ChatMessage('assistant', text);
	}
	function chatError(err: any) {
		errMessage = err;
		console.log(errMessage);
	}

	let mouth = new MouthSync();
	function aloud(text: string) {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = voice.Locale;
		utterance.rate = 1.1;

		utterance.onstart = (e) => {
			if (e.currentTarget && e.currentTarget instanceof HTMLAudioElement) {
				mouth.mouthValueByAudio(e.currentTarget, (value) => {
					let coreModel = model.internalModel.coreModel;
					coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', value);
				});
			}
		};
		utterance.onboundary = (e) => {
			const { charIndex, charLength, utterance } = e;
			chatDeltaMessage = new ChatMessage(
				'assistant',
				utterance.text.substring(0, charIndex + charLength)
			);
		};
		utterance.onend = () => {
			mouth.stop();
			waitSentenceCount--;
			speaking = 0 < waitSentenceCount;
			console.log('utterance end: ', speaking, waitSentenceCount);

			if (waitSentenceCount === 0) {
				if (preEndSpeech) {
					recorder?.stop();
					isDisplayCanvas = false;
				} else {
					setTimeout(speech, 10);
				}
			}
		};
		waitSentenceCount++;
		synth.speak(utterance, voice);
	}

	onMount(() => {});
</script>

<svelte:head>
	<title>Home</title>
	<script src="/live2dcubismcore.min.js" async></script>
	<script src="/live2d.min.js" async></script>
	<script src="/pixi.min.js" async></script>
	<script src="/index.min.js" async></script>
</svelte:head>

<div class="wh-100">
	<div class="container wh-100">
		<div style="display: flex; flex-direction: column;">
			<button
				class="chat-button"
				style:display={isDisplayCanvas ? 'none' : 'black'}
				on:click={start}
			>
				开始对话
			</button>
			<canvas bind:this={canvas} />
			<p>{errMessage}</p>
		</div>
	</div>
	{#if isDisplayCanvas}
		<div class="chat-text">{chatDeltaMessage.content}</div>
		<!-- <div class="used-tokens">{usedGptTokenLen} Tokens</div> -->
		<div class="chats" bind:this={chatsContainer}>
			{#each allMessageList as msg}
				<div class={msg.role}>{msg.content}</div>
			{/each}
		</div>
	{/if}
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
		display: flex;
		align-items: end;
		justify-content: center;
	}

	.chat-button {
		display: block;
		margin-bottom: 60px;
		padding: 5px 10px;
	}

	.chat-text {
		position: absolute;
		bottom: 20px;
		width: 100%;
		background: #5039208a;
		padding: 20px;
		box-sizing: border-box;
		font-size: xx-large;
		color: aliceblue;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.used-tokens {
		position: absolute;
		top: 30px;
		right: 10px;
		font-size: x-large;
		color: #39208a;
	}

	.chats {
		position: absolute;
		top: 30px;
		left: 30px;
		background: #5039208a;
		box-sizing: border-box;
		word-break: break-all;
		word-wrap: break-word;
		padding: 5px 0;
		width: 260px;
		height: 47vh;
		max-width: 260px;
		max-height: 47vh;
		overflow: auto;
	}

	.chats .system,
	.chats .user,
	.chats .assistant {
		padding: 4px 10px;
	}

	.chats .system {
		color: red;
	}
	.chats .user {
		color: wheat;
	}
	.chats .user::before {
		content: '我：';
	}
	.chats .assistant {
		color: aliceblue;
	}
	.chats .assistant::before {
		content: 'AI：';
	}
</style>
