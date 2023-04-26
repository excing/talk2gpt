<script lang="ts">
	import { onMount } from 'svelte';
	import { franc } from 'franc';
	import { SSE } from 'sse.js';
	import { sentence } from '$lib/strings';

	var isLoad = true;

	var voices: SpeechSynthesisVoice[] = [];
	var isEdge = false;

	var speechResultTranscript = '';

	var messages = [{ role: 'system', content: '你是一个友善的助手' }];

	var errorMessage = '';

	function chatgptStream(text: string) {
		messages[messages.length] = { role: 'user', content: text };
		var message = '';
		var readOffset = 0;
		var source = new SSE('https://openai.blendiv.com/v1/chat/completions', {
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'POST',
			payload: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: messages,
				max_tokens: 2000,
				temperature: 0.8,
				stream: true
			})
		});

		source.addEventListener('message', function (e: any) {
			if (e.data == '[DONE]') {
				// done
				messages[messages.length] = { role: 'assistant', content: message };
			} else {
				try {
					// message
					let data = JSON.parse(e.data);
					if (data.error) {
						// error
						errorMessage = data.error;
					} else {
						message += data.choices[0].delta.content || '';
						let st = sentence(message, readOffset);

						if (st.index !== -1) {
							console.log(message.substring(st.index, st.index + st.length));
							readOffset = st.index + st.length;
						}
					}
				} catch (error) {
					// error
				}
			}
			// console.log(e);
		});

		source.addEventListener('error', function (e: any) {
			// error
			console.log(e);
		});

		source.stream();
	}

	function chatgpt(text: string) {
		messages[messages.length] = { role: 'user', content: text };
		fetch('https://openai.blendiv.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: messages,
				max_tokens: 2000,
				temperature: 0.8,
				stream: false
			})
		})
			.then((resp) => {
				return resp.json();
			})
			.then((data) => {
				if (data.error) {
					throw new Error(`${data.error.code}: ${data.error.message}`);
				}
				// data
				let msg = data.choices[0].delta || data.choices[0].message || {};
				messages[messages.length] = { role: 'assistant', content: msg.content };
				textToSpeech(
					msg.content,
					{ rate: 1.0, pitch: 1.0, volume: 1.0 },
					(e) => {
						const { charIndex, charLength, utterance } = e;
						console.log(charIndex + charLength, utterance.text.length);
					},
					(e) => {
						speechRecognition();
					}
				);
			})
			.catch((e) => {
				errorMessage = e.message;
				console.error(e);
			});
	}

	function textToSpeech(
		text: string,
		options = { rate: 1.0, pitch: 1.0, volume: 1.0 },
		onBoundary = (event: SpeechSynthesisEvent) => {},
		onEnd = (event: SpeechSynthesisEvent) => {}
	) {
		const synth = window.speechSynthesis;

		// Check if Web Speech API is available
		if (!('speechSynthesis' in window)) {
			alert('The current browser does not support text-to-speech');
			return;
		}

		let lang = franc(text);
		if (lang === '' || lang === 'und') {
			lang = navigator.language;
		}
		if (lang === 'cmn') {
			lang = 'zh-CN';
		}

		let voice = voices.find((v) => langEq(v.lang, lang) && !v.localService);
		if (!voice) {
			voice = voices.find((v) => langEq(v.lang, navigator.language) && !v.localService);
		}

		// Create a new SpeechSynthesisUtterance object and set its parameters
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = voice || voices[0];
		utterance.rate = options.rate;
		utterance.pitch = options.pitch;
		utterance.volume = options.volume;

		// Speak the text
		synth.speak(utterance);
		utterance.addEventListener('boundary', onBoundary);
		utterance.addEventListener('end', onEnd);
	}

	const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
	const langEq = (lang1: string, lang2: string) => {
		let langStr1 = regionNamesInEnglish.of(lang1) || '';
		let langStr2 = regionNamesInEnglish.of(lang2) || '';
		if (langStr1.indexOf(langStr2) !== -1) return true;
		if (langStr2.indexOf(langStr1) !== -1) return true;
		return langStr1 === langStr2;
	};

	function speechRecognition() {
		errorMessage = '';

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();

		recognition.continuous = false;
		recognition.lang = 'zh-CN';
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			try {
				console.log(event);

				let speechResult = event.results[0];

				speechResultTranscript = speechResult[0].transcript;
				if (speechResult.isFinal) {
					chatgpt(speechResultTranscript);
				}
			} catch (e: any) {
				errorMessage = `Speech recogniion result failed: ${e.message}`;
				console.error(e);
			}
		};

		recognition.onspeechend = function () {
			console.log('onspeeched');

			recognition.stop();
		};

		recognition.onnomatch = () => {
			errorMessage = '我没听清，请再说一次。';
		};

		recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
			if (e.error === 'no-speech') {
				console.log('Listen again');

				speechRecognition();
			} else {
				errorMessage = e.error;
				console.error(e);
			}
		};

		try {
			recognition.start();
		} catch (error) {
			console.error(error);
		}
	}

	onMount(() => {
		isEdge = /Edg\/\d./i.test(navigator.userAgent);

		// Check if Web Speech API is available
		if (!('speechSynthesis' in window)) {
			alert('The current browser does not support text-to-speech');
			return;
		}

		const synth = window.speechSynthesis;

		voices = synth.getVoices();
		synth.onvoiceschanged = function () {
			voices = synth.getVoices();
		};

		isLoad = false;
	});
</script>

{#if isLoad}
	<h1>加载中……</h1>
{:else if !isEdge}
	<h1>
		请使用 Microsoft Edge 浏览器打开，<a href="https://www.microsoft.com/edge">点此进入官网下载</a
		>。
	</h1>
{:else}
	<button on:click={speechRecognition}>开始说话</button>
	<p>{speechResultTranscript}</p>
	<p>{errorMessage}</p>
	<h2>对话</h2>
	{#each messages as message}
		<div>{message.role}: {message.content}</div>
	{/each}
{/if}
