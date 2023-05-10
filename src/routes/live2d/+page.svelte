<script lang="ts">
	let canvas: any;

	// const cubism2Model =
	// 	'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json';
	const cubism2Model = '/yumi/yumi.model3.json';

	async function start() {
		const app = new PIXI.Application({
			view: canvas,
			autoStart: true,
			resizeTo: window,
			// backgroundColor: 0x333333,
			transparent: true
		});

		const model = await PIXI.live2d.Live2DModel.from(cubism2Model/*, { autoInteract: false }*/);

		const motionManager = model.internalModel.motionManager;
		const motionGroups: any[] = [];

		const definitions = motionManager.definitions;

		for (const [group, motions] of Object.entries(definitions)) {
			motionGroups.push({
				name: group,
				motions:
					motions?.map((motion, index) => ({
						file: motion.file || motion.File || '',
						error:
							motionManager.motionGroups[group]![index]! === null ? 'Failed to load' : undefined
					})) || []
			});
		}

		const expressionManager = motionManager.expressionManager;
		const expressions =
			expressionManager?.definitions.map((expression, index) => ({
				file: expression.file || expression.File || '',
				error: expressionManager!.expressions[index]! === null ? 'Failed to load' : undefined
			})) || [];

		let motionState = motionManager.state;

		console.log(motionGroups, expressions, motionState);

		app.stage.addChild(model);

		// 变换
		// model.x = 100;
		// model.y = 100;
		model.scale.set(0.3, 0.3);

		// 交互
		model.on('hit', (hitAreas) => {
			if (hitAreas.includes('body')) {
				model.motion('tap_body');
			}
		});
	}
</script>

<svelte:head>
	<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
	<script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"></script>
</svelte:head>

<button on:click={start}>开始</button>
<canvas bind:this={canvas} />
