<script lang="ts">
	import { onMount } from 'svelte';
	import { ChatMessage, ChatRequestBody, chat, cancelChat } from '$lib/openai';
	import {
		textToSpeech,
		cancelTextToSpeech,
		speechRecognition,
		initSpeechVoices
	} from '$lib/audio';

	var prefixPrompt = new ChatMessage(
		'system',
		'你是一个友善且有趣的朋友。请每个回复尽可能的短，多使用成语，最多不超过80字。'
	);

	var requestBody = new ChatRequestBody([prefixPrompt], 200, 0.5, true);
	var speechUtteranceText = '';
	var errMessage: any = '';

	function start() {
		new Audio('speech_start.mp3').play();
		speechRecognition(
			speechRecognitionStart,
			speechRecognitionDelta,
			speechRecognitionDone,
			speechRecognitionError
		);
	}

	function speechRecognitionStart() {
		cancelChat();
		cancelTextToSpeech();
		requestBody.messages[requestBody.messages.length] = new ChatMessage('user', '');
	}
	function speechRecognitionDelta(text: string) {
		requestBody.messages[requestBody.messages.length - 1] = new ChatMessage('user', text);
	}
	function speechRecognitionDone(text: string) {
		new Audio('speech_stop.mp3').play();
		requestBody.messages[requestBody.messages.length - 1] = new ChatMessage('user', text);
		chat(requestBody, chatDelta, chatDone, chatError);
		speechUtteranceText = '';
		requestBody.messages[requestBody.messages.length] = new ChatMessage('assistant', '');
	}
	function speechRecognitionError(err: any) {
		errMessage = err;
	}
	function chatDelta(text: string) {
		console.log(text);

		textToSpeech(
			text,
			{ rate: 1.0, pitch: 1.0, volume: 1.0 },
			textToSpeechBoundary,
			textToSpeechEnd,
			textToSpeechError
		);
	}
	function chatDone(text: string) {
		// requestBody.messages[requestBody.messages.length - 1] = new ChatMessage('assistant', text);
		console.log('Chat Done >: ', text);
	}
	function chatError(err: any) {
		errMessage = err;
	}
	function textToSpeechBoundary(e: SpeechSynthesisEvent) {
		const { charIndex, charLength, utterance } = e;
		requestBody.messages[requestBody.messages.length - 1] = new ChatMessage(
			'assistant',
			speechUtteranceText + utterance.text.substring(0, charIndex + charLength)
		);
	}
	function textToSpeechEnd(e: SpeechSynthesisEvent, isLast: boolean) {
		speechUtteranceText += e.utterance.text;
		requestBody.messages[requestBody.messages.length - 1] = new ChatMessage(
			'assistant',
			speechUtteranceText
		);
		if (isLast) {
			start();
		}
	}
	function textToSpeechError(err: any) {
		console.log(err);
	}

	onMount(() => {
		initSpeechVoices();
	});
</script>

<noscript><strong>请启用 JavaScript，否则页面无法正常工作。</strong></noscript>
<h1>Test</h1>
<button on:click={start}>开始对话</button>
<p>{errMessage}</p>
<div>
	{#each requestBody.messages as msg}
		<p style="white-space: pre-wrap; word-wrap: break-word">{msg.content}</p>
	{/each}
</div>
