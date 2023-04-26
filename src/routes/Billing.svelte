<script lang="ts">
	import { onMount } from 'svelte';

	var subscription = 0;
	var usage = 0;
	var errMessage = '';

	onMount(() => {
		fetch('/api/openai/billing')
			.then((resp) => resp.json())
			.then((data) => {
				subscription = data.subscription;
				usage = data.usage;
			})
			.catch((err) => {});
	});
</script>

<div>
	{#if errMessage}
		{errMessage}
	{:else}
        USD: {subscription}, usage: {usage}
    {/if}
</div>
