<script lang="ts">
	import { sentence } from '$lib/strings';

	let value = '';
	let sentences: any[] = [];

	function handle() {
        sentences = [];
		let readOffset = 0;
		for (let index = 0; index <= value.length; index++) {
			const element = value.substring(0, index);
			let st = sentence(element, readOffset);
			if (st.index !== -1) {
				// console.log(st);
				sentences[sentences.length] = st;
				readOffset = st.index + st.length;
			}
		}
	}
</script>

<textarea bind:value style="width: 80vw; height: 200px;" />
<br />
<button on:click={handle}>Handle</button>
{#each sentences as st}
	{#if st}
		<p>{st.text}</p>
	{/if}
{/each}
