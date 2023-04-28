<script lang="ts">
	import { onMount } from 'svelte';

	var isLoading = true;
	var isEdgeBrower = false;
	var userAgent = '';

	import Navbar from './Navbar.svelte';
	import Sidebar from './Sidebar.svelte';

	let open = false;

	onMount(() => {
		userAgent = navigator.userAgent;
		isEdgeBrower = /Edg[a-zA-Z]?\/\d./i.test(userAgent);
		isLoading = false;
	});
</script>

{#if isLoading}
	<div class="loader wh-80px" />
{:else if isEdgeBrower}
	<Sidebar bind:open />
	<Navbar bind:sidebar={open} />
	<slot />
{:else}
	<span>{userAgent}</span>
	<h1>
		请使用 Microsoft Edge 浏览器打开本网站，或进入<a href="https://www.microsoft.com/edge"
			>Microsoft Edge 官方网站</a
		>下载安装。
	</h1>
{/if}

<svelte:head>
	<link href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css" rel="stylesheet" />
</svelte:head>

<style>
	:global(body) {
		padding: 0;
	}

	.wh-80px {
		width: 80px;
		height: 80px;
	}
	/* CSS LOADER */
	.loader {
		border: 6px solid #efefef;
		border-top: 6px solid #111;
		border-radius: 50%;
		animation: spin 1.2s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}
</style>
