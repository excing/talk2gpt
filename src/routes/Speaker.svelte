<script>
	import { textToSpeech } from '$lib/audio/tts.js';

	var src =
		'点此注册Depay账号，可以用邮箱或者手机号，我本人选的谷歌邮箱注册，如果验证码没收到很可能在垃圾箱里。账号注册成功后，会让你下载它们的App安装，苹果手机需要登录海外的Apple账号，安卓手机可以直接下载apk安装，我下载的是depay1.2.4.apk版本。耐心等待APP安装完毕，用刚刚注册的账号和密码登录Depay。';
	var word = '';

	function start() {
		textToSpeech({ text: src, listener: (index, len) => {
			index = index || 0
			len = len || 0
			word = src.substring(0, index + len)
		}})
	}
</script>

<div class="speaker" />
<span>{word}</span>
<button on:click={start}>开始</button>

<style>
	.speaker {
		background-color: black;
	}
</style>
