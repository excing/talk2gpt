<script lang="ts">
	import { streamPlayer } from '$lib/player';
	import { speechSynthesis } from '$lib/synth';
	import { onMount } from 'svelte';

	let canvas: any;

	// const cubism2Model = '/miaojiu/喵玖.model3.json';
	// const cubism2Model = '/mianfeimox/llny.model3.json';
	// const cubism2Model = '/shizuku/shizuku.model.json';
	// const cubism2Model = '/yumi/yumi.model3.json';
	// const cubism2Model = '/mimosa_vts/av.model3.json';
	// const cubism2Model = '/ariu/ariu.model3.json';
	const cubism2Model = '/march7/三月七.model3.json';

	let model: any;
	let motionGroups: any[] = [];
	let expressions: any[] = [];

	let synth = speechSynthesis;
	let voices: any[] = [];
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

	async function start() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			resizeTo: window,
			backgroundColor: 0x333333,
			// transparent: true
		});

		PIXI.live2d.config.sound = false;

		model = await PIXI.live2d.Live2DModel.from(cubism2Model, { autoInteract: false });

		pixiModelLoaded(model);

		app.stage.addChild(model);
	}

	function pixiModelLoaded(model: any) {
		// 变换
		// model.x = 100;
		// model.y = 100;
		model.scale.set(0.3, 0.3);

		const motionManager = model.internalModel.motionManager;

		const definitions = motionManager.definitions;

		for (const [group, motions] of Object.entries(definitions)) {
			motionGroups[motionGroups.length] = {
				name: group,
				motions:
					motions?.map((motion, index) => ({
						file: motion.file || motion.File || '',
						error:
							motionManager.motionGroups[group]![index]! === null ? 'Failed to load' : undefined
					})) || []
			};
		}
		motionSelect = motionGroups[0];

		const expressionManager = motionManager.expressionManager;
		expressions =
			expressionManager?.definitions.map((expression, index) => ({
				name: expression.name || expression.Name || '',
				file: expression.file || expression.File || '',
				error: expressionManager!.expressions[index]! === null ? 'Failed to load' : undefined
			})) || [];
		expressionSelect = expressions[0];

		let motionState = motionManager.state;

		console.log('params: ', motionGroups, expressions, motionState);
	}

	let motionSelect: any;
	let expressionSelect: any;

	function onSelectMotion() {
		model.motion(motionSelect.name);
	}

	function onSelectExpression() {
		model.expression(expressionSelect.name);
	}

	function getVoices() {
		voices = synth.getVoices();
	}

	function aloud() {
		let text =
			'Americans often try to say things as quickly as possible. So, for some expressions, we use the first letters of the words instead of saying each word. Many common expressions or long names are shortened this way.';
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = voice.Locale;
		utterance.onstart = (e) => {
			console.log('utterance.onstart', e);

			if (e.currentTarget && e.currentTarget instanceof HTMLAudioElement)
				mouthValueByAudio(e.currentTarget, (value) => {
					console.log('mouth value: ', value);

					mouthOpen(value);
				});
		};
		synth.speak(utterance, voice);
	}

	function mouthOpen(value: number) {
		let coreModel = model.internalModel.coreModel;

		let lipSyncIds = model.internalModel.motionManager.lipSyncIds;
		let perameterID = lipSyncIds ? lipSyncIds[0] : undefined;

		if (perameterID) {
			coreModel.setParameterValueById(perameterID, value, 0.8);
		} else {
			coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', value);
		}
	}

	function speak() {
		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(function (stream) {
				mouthSync(stream);
			})
			.catch(function (error) {
				// error
				console.error(error);
			});
	}

	function mouthSync(stream: MediaStream) {
		mouthValueByStream(stream, (value) => {
			console.log('mouth value: ', value);

			mouthOpen(value);
		});
	}

	function clamp(num: number, lower: number, upper: number) {
		return num < lower ? lower : num > upper ? upper : num;
	}

	function _mouthValue(context: AudioContext, source: AudioNode, onasync: (value: number) => void) {
		const analyser = context.createAnalyser();

		analyser.fftSize = 256;
		analyser.minDecibels = -90;
		analyser.maxDecibels = -10;
		analyser.smoothingTimeConstant = 0.85;

		source.connect(analyser);
		analyser.connect(context.destination);

		const pcmData = new Float32Array(analyser.fftSize);
		let lastValue = 0;
		const check = () => {
			let sumSquares = 0.0;
			analyser.getFloatTimeDomainData(pcmData);
			for (const amplitude of pcmData) {
				sumSquares += amplitude * amplitude;
			}
			let value = f(sumSquares, pcmData.length);
			let currValue = (value + lastValue) / 2.0;
			if (value === lastValue) {
				currValue = value;
			}
			lastValue = value;

			onasync(currValue);
			requestAnimationFrame(check);
		};
		requestAnimationFrame(check);
	}

	function mouthValueByAudio(audio: HTMLAudioElement, onasync: (value: number) => void) {
		const context = new AudioContext();
		const source = context.createMediaElementSource(audio);

		_mouthValue(context, source, onasync);
	}

	function mouthValueByStream(stream: MediaStream, onasync: (value: number) => void) {
		const context = new AudioContext();
		const source = context.createMediaStreamSource(stream);

		_mouthValue(context, source, onasync);
	}

	function f(sum: number, len: number) {
		let value = parseFloat(Math.sqrt((sum / len) * 20).toFixed(2));
		let min_ = 0;
		let max_ = 2;
		let weight = 1.8; // Fix small mouth when speaking

		if (value > 0) {
			min_ = 0.4; // Fix small mouth when speaking
		}

		value = clamp(value * weight, min_, max_); // must be between 0 (min) and 1 (max)
		return value;
	}

	onMount(() => {
		synth.onvoiceschanged = () => {
			voices = synth.getVoices();
			voice = voices[0];
		};
	});
</script>

<svelte:head>
	<title>Live2D simple</title>
	<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" async></script>
	<script
		src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"
		async
	></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js" async></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js" async></script>
</svelte:head>

<div style="display: flex;">
	<div style="width: 200px;">
		<button on:click={start}>开始</button>
		<button on:click={aloud}>朗读</button>
		<button on:click={getVoices}>说话人</button>
		<button on:click={speak}>说话</button>
		<br />
		<select bind:value={voice}>
			{#each voices as voice}
				<option value={voice}>{voice.Name}</option>
			{/each}
		</select>
		<br />
		<select bind:value={motionSelect} on:change={onSelectMotion}>
			{#each motionGroups as mo}
				<option value={mo}>{mo.name}</option>
			{/each}
		</select>
		<br />
		<select bind:value={expressionSelect} on:change={onSelectExpression}>
			{#each expressions as ex}
				<option value={ex}>{ex.file}</option>
			{/each}
		</select>
	</div>
	<canvas bind:this={canvas} style="flex: 1" />
</div>
