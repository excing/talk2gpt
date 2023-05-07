<script lang="ts">
	import { getRecordFile, initSpeechVoices, textToSpeech } from '$lib/audio';
	import { onMount } from 'svelte';

	let edittext = '';
	let playText = '';
	// tts 播放的声音无法清晰有效的录制，此方法无效。
	async function handleRecord() {
		const screenStream = await navigator.mediaDevices.getDisplayMedia({
			audio: true,
			video: true
		});
		const ssst = screenStream.getAudioTracks();
		ssst.forEach((element) => {
			console.log(element.label, element.kind);
		});
		// const cameraStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
		// const mixedStream = new MediaStream([
		// 	...screenStream.getTracks(),
		// 	...cameraStream.getAudioTracks()
		// ]);
		const recorder = new MediaRecorder(screenStream);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => chunks.push(e.data);
		recorder.onstop = () => {
			const file = getRecordFile(chunks, recorder.mimeType);
			const url = URL.createObjectURL(file);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.name;
			link.click();
		};

		recorder.start();
		textToSpeech(edittext,
			{ rate: 1.0, pitch: 1.0, volume: 1.0 },
			(e: any) => {
				const { charIndex, charLength, utterance } = e;
				playText = utterance.text.substring(0, charIndex + charLength);
			},
			() => {
				setTimeout(() => {
					recorder.stop();
				}, 2000);
			},
			() => {}
		);
	}

	onMount(() => {
		initSpeechVoices();
	});
</script>

<button on:click={handleRecord}>开始录制</button>
<textarea bind:value={edittext}/>
<div>{playText}</div>
