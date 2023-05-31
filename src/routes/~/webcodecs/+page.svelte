<script lang="ts">
	import { Muxer, ArrayBufferTarget } from 'webm-muxer';

	let audioTrack: MediaStreamTrack;
	let audioTrack1: MediaStreamTrack;
	let audioEncoder: AudioEncoder | null;
	let audioEncoder1: AudioEncoder | null;
	let videoEncoder: VideoEncoder | null;
	let muxer: Muxer<ArrayBufferTarget> | null;

	async function start() {
		let userMedia = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
		let _audioTrack = userMedia.getAudioTracks()[0];
		let audioSampleRate = _audioTrack?.getCapabilities().sampleRate?.max || 22050;

		let displayMedia = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
		let _audioTrack1 = displayMedia.getAudioTracks()[0];
		let audioSampleRate1 = _audioTrack1?.getCapabilities().sampleRate?.max || 22050;

		let _muxer = new Muxer({
			target: new ArrayBufferTarget(),
			video: {
				codec: 'V_VP9',
				width: 1280,
				height: 720
			},
			audio: {
				codec: 'A_OPUS',
				sampleRate: audioSampleRate,
				numberOfChannels: 1
			},
			firstTimestampBehavior: 'offset' // Because we're directly piping a MediaStreamTrack's data into it
		});

		let _videoEncoder = new VideoEncoder({
			output: (chunk, meta) => _muxer.addVideoChunk(chunk, meta),
			error: (e) => console.error(e)
		});
		_videoEncoder.configure({
			codec: 'vp09.00.10.08',
			width: 1280,
			height: 720,
			bitrate: 1e6
		});

		let _audioEncoder = new AudioEncoder({
			output: (chunk, meta) => _muxer.addAudioChunk(chunk, meta),
			error: (e) => console.error(e)
		});
		_audioEncoder.configure({
			codec: 'opus',
			numberOfChannels: 1,
			sampleRate: audioSampleRate,
			bitrate: 64000
		});

		let _audioEncoder1 = new AudioEncoder({
			output: (chunk, meta) => _muxer.addAudioChunk(chunk, meta),
			error: (e) => console.error(e)
		});
		_audioEncoder1.configure({
			codec: 'opus',
			numberOfChannels: 1,
			sampleRate: audioSampleRate1,
			bitrate: 64000
		});

		writeAudioToEncoder(_audioEncoder, _audioTrack);
		writeAudioToEncoder(_audioEncoder1, _audioTrack1);

		muxer = _muxer;
		videoEncoder = _videoEncoder;
		audioEncoder = _audioEncoder;
		audioEncoder1 = _audioEncoder1;
		audioTrack = _audioTrack;
		audioTrack1 = _audioTrack1;
	}

	function writeAudioToEncoder(audioEncoder: AudioEncoder, audioTrack: MediaStreamTrack) {
		// Create a MediaStreamTrackProcessor to get AudioData chunks from the audio track
		let trackProcessor = new MediaStreamTrackProcessor({ track: audioTrack });
		let consumer = new WritableStream({
			write(audioData) {
				audioEncoder.encode(audioData);
				audioData.close();
			}
		});
		trackProcessor.readable.pipeTo(consumer);
	}

	let frameCounter = 0;
	function encodeVideoFrame(videoEncoder: VideoEncoder) {
		let frame = new VideoFrame(canvas, {
			timestamp: ((frameCounter * 1000) / 30) * 1000
		});

		frameCounter++;

		videoEncoder.encode(frame, { keyFrame: frameCounter % 30 === 0 });
		frame.close();
	}

	const endRecording = async () => {
		audioTrack?.stop();
		audioTrack1?.stop();

		await audioEncoder?.flush();
		await audioEncoder1?.flush();
		await videoEncoder?.flush();
		muxer?.finalize();

		if (muxer) {
			let { buffer } = muxer.target;
			downloadBlob(new Blob([buffer]));
		}

		audioEncoder = null;
		audioEncoder1 = null;
		videoEncoder = null;
		muxer = null;
	};

	const downloadBlob = (blob: Blob) => {
		let url = window.URL.createObjectURL(blob);
		let a = document.createElement('a');
		a.style.display = 'none';
		a.href = url;
		a.download = 'picasso.webm';
		document.body.appendChild(a);
		a.click();
		window.URL.revokeObjectURL(url);
	};
</script>

<div>
	<button on:click={start}>开始</button>
	<button on:click={endRecording}>停止</button>
</div>
