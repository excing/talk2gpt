<script lang="ts">
	import { encode } from '@beskar-labs/gpt-encoder';

	let text = 'This is an example sentence to try encoding out on!';

    $: encodeNumbers = encode(text);
	$: tokens = encodeNumbers.length;
</script>

<textarea bind:value={text} style="width: 80vw; height: 200px" />
<p style="word-break: break-all;">{encodeNumbers}</p>
<p>Tokens: {tokens}</p>
