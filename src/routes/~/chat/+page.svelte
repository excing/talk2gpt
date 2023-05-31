<script lang="ts">
	import { onMount } from 'svelte';
	import { speechSynthesis } from '$lib/synth';
	import { ChatMessage, ChatRequestBody, chat } from '$lib/openai';
	import { MouthSync } from '$lib/mouth';
	import { speechRecognition, whisper } from '$lib/audio';
	import { getRecordFile } from '$lib/audio';

	var displayMediaOptions: DisplayMediaStreamOptions = {
		video: true,
		audio: true
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

	let prefixPromptText = '你是一个友善的助手，每个回复最多不超过 120 个字。';
	let endPrompt = '我很满意你的服务';
	let preEndSpeech = false;

	$: prefixPrompt = new ChatMessage('system', prefixPromptText);

	let requestBody = new ChatRequestBody([], 400, 0.8, true);
	let errMessage: any = '';

	let waitRequestList: ChatMessage[] = [];
	let waitSentenceCount = 0;
	let speaking = false;

	let isDisplayCanvas = false;

	let isWhisper = false;
	$: asr = isWhisper ? whisper : speechRecognition;

	let recorder: MediaRecorder | null = null;

	function start() {
		isDisplayCanvas = true;

		displayLive2d();

		handleRecord();

		speech();
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
		// messages[messages.length] = new ChatMessage('user', '');
	}
	function speechRecognitionDelta(text: string) {
		// messages[messages.length - 1] = new ChatMessage('user', text);
	}
	function speechRecognitionDone(text: string) {
		if (-1 < text.indexOf(endPrompt)) {
			preEndSpeech = true;
		}
		new Audio('/speech_stop.mp3').play();
		requestBody.messages = [prefixPrompt, new ChatMessage('user', text)];
		chat(requestBody, chatDelta, chatDone, chatError);
	}
	function speechRecognitionError(event: any) {
		// event: SpeechRecognitionErrorEvent
		errMessage = `Speech recognition error detected: ${event.error}`;
		if (event.message) {
			errMessage += `\nAdditional information: ${event.message}`;
		}
	}

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
		} catch (error) {
			errMessage = error;
		}

		model = await PIXI.live2d.Live2DModel.from(cubism2Model, { autoInteract: false });

		model.scale.set(0.4, 0.4);

		app.stage.addChild(model);
	}

	function chatDelta(text: string) {
		aloud(text);
	}
	function chatDone(text: string) {
		// messages[messages.length - 1] = new ChatMessage('assistant', text);
		console.log('Chat Done >: ', text);
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

			if (waitSentenceCount === 0) {
				if (preEndSpeech) {
					recorder?.stop();
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
		<button class="chat-button" style:display={isDisplayCanvas ? 'none' : 'black'} on:click={start}>
			开始对话
		</button>
		<div>
			<canvas bind:this={canvas} />
			<p>{errMessage}</p>
		</div>
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
		display: flex;
		align-items: end;
		justify-content: center;
	}

	.chat-button {
		margin-bottom: 120px;
		padding: 5px 10px;
	}
</style>
