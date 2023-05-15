<script lang="ts">
	import { speechSynthesis } from '$lib/synth';
	import { MouthSync } from '$lib/mouth';

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

	const cubism2Model = '/shizuku/shizuku.model.json';

	let model: any;
	let canvas: any;

	async function displayLive2d() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			resizeTo: window,
			transparent: true
		});

		PIXI.live2d.config.sound = false;

		model = await PIXI.live2d.Live2DModel.from(cubism2Model, { autoInteract: false });

		model.scale.set(0.3, 0.3);

		app.stage.addChild(model);
	}

	async function speech() {
		let messages = [
			'我天天很开心，才怪。',
			'万里无云最是看海看山看星星的好时候。',
			'北边来了个只马，打南边来了个哈哈，只马打哈哈。',
			'世事无常，珍爱自己。',
			'故常无欲以观其妙，常有欲，以观其缴，此两者同出而异名，同谓之玄，玄之又玄，众妙之门。'
		];

		messages.forEach((msg) => {
			setTimeout(() => {
				aloud(msg);
			}, 1000);
		});
	}

	let mouth = new MouthSync();
	function aloud(text: string) {
		console.log(text);

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = voice.Locale;

		utterance.onstart = (e) => {
			console.log('utterance.onstart 1');

			if (e.currentTarget && e.currentTarget instanceof HTMLAudioElement) {
				console.log('utterance.onstart 2');

				mouth.mouthValueByAudio(e.currentTarget, (value) => {
					let coreModel = model.internalModel.coreModel;
					coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', value);
				});
			}
		};
		utterance.onend = () => {
			mouth.stop();
		};
		synth.speak(utterance, voice);
	}

	async function start() {
		await displayLive2d();
		await speech();
	}
</script>

<svelte:head>
	<title>Live2d 2</title>
	<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" async></script>
	<script
		src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"
		async
	></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js" async></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js" async></script>
	<style>
		body {
			padding: 0;
			margin: 0;
		}
	</style>
</svelte:head>

<div style="width: 100%; height: 100%;">
	<button on:click={start}>Start</button>
	<canvas bind:this={canvas} />
</div>

<style>
	:global(body) {
		padding: 0;
	}

	.wh-80px {
		width: 80px;
		height: 80px;
	}
	/* CSS LOADER */
	.loader {
		border: 6px solid #efefef;
		border-top: 6px solid #111;
		border-radius: 50%;
		animation: spin 1.2s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}
</style>
