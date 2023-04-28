<script lang="ts">
	var displayMediaOptions: DisplayMediaStreamOptions = {
		video: true,
		audio: true
	};

	let log = '';
	let stream: MediaStream;

	console.log = (msg) => (log += `${msg}<br>`);
	console.error = (msg) => (log += `<span class="error">${msg}</span><br>`);
	console.warn = (msg) => (log += `<span class="warn">${msg}<span><br>`);
	console.info = (msg) => (log += `<span class="info">${msg}</span><br>`);

	async function startCapture() {
		log = '';

		try {
			stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
			dumpOptionsInfo();
		} catch (err) {
			console.error('Error: ' + err);
		}
	}

	function stopCapture() {
		let tracks = stream.getTracks();

		tracks.forEach((track) => track.stop());
		// srcObject = null;
	}

	function srcObject(node: HTMLMediaElement, stream: MediaStream) {
		node.srcObject = stream;
		return {
			update(newStream: MediaStream) {
				if (node.srcObject != newStream) {
					// the important change
					node.srcObject = newStream;
				}
			}
		};
	}

	function dumpOptionsInfo() {
		const videoTrack = stream.getVideoTracks()[0];

		console.info('Track settings:');
		console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
		console.info('Track constraints:');
		console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
	}
</script>

<p>
	This example shows you the contents of the selected part of your display. Click the Start Capture
	button to begin.
</p>

<p>
	<button on:click={startCapture}>Start Capture</button>
	<button on:click={stopCapture}>Stop Capture</button>
</p>

<video use:srcObject={stream} autoplay> <track kind="captions" /></video>
<br />

<strong>Log:</strong>
<br />
<pre>{log}</pre>

<style>

	video {
		border: 1px solid #999;
		width: 98%;
		max-width: 860px;
	}

</style>
