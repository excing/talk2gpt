<script>
	import { speechSynthesis } from '$lib/synth';
	import { onMount } from 'svelte';

	let text = '';
	let synth = speechSynthesis;
	let voices = synth.getVoices();
	let voice = voices[0];
	let boundary = '';

	function start() {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = voice.Locale;
		utterance.onstart = (e) => {
			console.log(e);
		}
		utterance.onboundary = (e) => {
			boundary = e.utterance.text.substring(0, e.charIndex + e.charLength);
		}
		utterance.onend = (e) => {
			boundary = e.utterance.text;
		}
		synth.speak(utterance, voice);
	}

	onMount(() => {
		synth.onvoiceschanged = () => {
			voices = synth.getVoices();
		};
	});
</script>

<button on:click={start}>开始</button>
<div>
	<textarea bind:value={text} />
</div>
<p>{boundary}</p>
{#if voice}
	<p>{voice.ShortName}</p>
{/if}
<select bind:value={voice}>
	{#each voices as voice}
		<option value={voice}>{voice.Name}</option>
	{/each}
</select>

<style>
	textarea {
		width: 100%;
		height: 200px;
	}
</style>
