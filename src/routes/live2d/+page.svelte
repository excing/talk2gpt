<script lang="ts">
	let canvas: any;

	const cubism2Model =
		'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json';
	// const cubism2Model = '/yumi/yumi.model3.json';

	let model: any;
	let motionGroups: any[] = [];
	let expressions: any[] = [];

	async function start() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			resizeTo: window,
			// backgroundColor: 0x333333,
			transparent: true
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

	function mouthSync() {
		let coreModel = model.internalModel.coreModel;
		coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', parseFloat(Math.random().toFixed(1)));
	}
</script>

<svelte:head>
	<title>Live2D simple</title>
	<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
	<script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"></script>
</svelte:head>

<div style="display: flex;">
	<div style="width: 200px;">
		<button on:click={start}>开始</button>
		<button on:click={mouthSync}>说话</button>
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
