<script lang="ts">
	import { onMount } from 'svelte';
	import { ChatMessage, ChatRequestBody, chat, cancelChat } from '$lib/openai';
	import {
		textToSpeech,
		cancelTextToSpeech,
		speechRecognition,
		whisper,
		initSpeechVoices
	} from '$lib/audio';
	import Billing from './Billing.svelte';
	import App from './App.svelte';

	var prefixPrompt = new ChatMessage(
		'system',
		'你是一个友善且有趣的朋友。请每个回复尽可能的短，多使用成语，最多不超过80字。'
	);
	var endPrompt = '我很满意你的服务';

	var messages: ChatMessage[] = [];
	var requestBody = new ChatRequestBody([], 200, 0.8, true);
	var speechUtteranceText = '';
	var errMessage: any = '';

	var chatStatus = 0; // 0: 未开始；1: 正在对话; 2: 准备结束对话.
	var isShowUserBilling = false;
	var isWhisper = false;

	var maxContextSize = 10; // 上下文最大大小，即会话最大长度。

	$: asr = isWhisper ? whisper : speechRecognition;

	function start() {
		chatStatus = 1;
		new Audio('speech_start.mp3').play();
		asr(
			speechRecognitionStart,
			speechRecognitionDelta,
			speechRecognitionDone,
			speechRecognitionError
		);
	}

	function speechRecognitionStart() {
		cancelChat();
		cancelTextToSpeech();
		messages[messages.length] = new ChatMessage('user', '');
	}
	function speechRecognitionDelta(text: string) {
		messages[messages.length - 1] = new ChatMessage('user', text);
	}
	function speechRecognitionDone(text: string) {
		if (-1 < text.indexOf(endPrompt)) {
			chatStatus = 2;
		}
		new Audio('speech_stop.mp3').play();
		messages[messages.length - 1] = new ChatMessage('user', text);
		if (maxContextSize < messages.length) {
			requestBody.messages = [prefixPrompt, ...messages.slice(-maxContextSize)];
		} else {
			requestBody.messages = [prefixPrompt, ...messages];
		}
		chat(requestBody, chatDelta, chatDone, chatError);
		speechUtteranceText = '';
		messages[messages.length] = new ChatMessage('assistant', '');
	}
	function speechRecognitionError(event: any) {
		// event: SpeechRecognitionErrorEvent
		errMessage = `Speech recognition error detected: ${event.error}`;
		if (event.message) {
			errMessage += `\nAdditional information: ${event.message}`;
		}
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
		// messages[messages.length - 1] = new ChatMessage('assistant', text);
		console.log('Chat Done >: ', text);
	}
	function chatError(err: any) {
		errMessage = err;
	}
	function textToSpeechBoundary(e: SpeechSynthesisEvent) {
		const { charIndex, charLength, utterance } = e;
		messages[messages.length - 1] = new ChatMessage(
			'assistant',
			speechUtteranceText + utterance.text.substring(0, charIndex + charLength)
		);
	}
	function textToSpeechEnd(e: SpeechSynthesisEvent, isLast: boolean) {
		speechUtteranceText += e.utterance.text;
		messages[messages.length - 1] = new ChatMessage('assistant', speechUtteranceText);
		if (isLast) {
			if (chatStatus === 2) {
				chatStatus = 0;
			} else {
				start();
			}
		}
	}
	function textToSpeechError(event: any) {
		// event: SpeechSynthesisErrorEvent
		errMessage = `An error has occurred with the speech synthesis: ${event.error}`;
	}
	function showUserBilling() {
		isShowUserBilling = !isShowUserBilling;
	}

	onMount(() => {
		initSpeechVoices();
	});
</script>

<noscript><strong>请启用 JavaScript，否则页面无法正常工作。</strong></noscript>
<App>
	<h1>Test</h1>
	{#if chatStatus === 1}
		<div>当你说“<strong>{endPrompt}</strong>”时，结束对话。</div>
	{:else}
		<button on:click={start}>开始对话</button>
		<label>
			<input type="checkbox" bind:checked={isWhisper} />
			Whisper
		</label>
	{/if}
	{#if isShowUserBilling}
		<button on:click={showUserBilling}>更新账户使用量</button>
		<Billing />
	{:else}
		<button on:click={showUserBilling}>显示账户使用量</button>
	{/if}
	<p style="color: red">{errMessage}</p>
	<div>
		{#each messages as msg}
			<p style="white-space: pre-wrap; word-wrap: break-word">{msg.content}</p>
		{/each}
	</div>
</App>
