<script lang="ts">

	function play() {
		let player = new Audio('/speech_start.mp3');
		player.volume = 0.3;
		player.play();

        setTimeout(() => {
			let player = new Audio('/speech_stop.mp3');
			player.volume = 0.3;
			player.play();
		}, 1000);
	}
</script>

<div>
	<button on:click={play}>播放</button>
    <audio controls src="/speech_start.mp3"/>
</div>
