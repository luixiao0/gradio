import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
// @ts-ignore
import custom_media from "postcss-custom-media";

import {
	inject_ejs,
	patch_dynamic_import,
	generate_cdn_entry,
	handle_ce_css
} from "./build_plugins";

const GRADIO_VERSION = process.env.GRADIO_VERSION || "asd_stub_asd";
const TEST_CDN = !!process.env.TEST_CDN;
const CDN = TEST_CDN
	? "http://localhost:4321/"
	: `https://gradio.s3-us-west-2.amazonaws.com/${GRADIO_VERSION}/`;

//@ts-ignore
export default defineConfig(({ mode }) => {
	const CDN_URL = mode === "production:cdn" ? CDN : "/";
	const production =
		mode === "production:cdn" ||
		mode === "production:local" ||
		mode === "production:website";
	const is_cdn = mode === "production:cdn" || mode === "production:website";

	return {
		base: is_cdn ? CDN_URL : "./",

		server: {
			port: 9876
		},

		build: {
			sourcemap: true,
			target: "esnext",
			minify: production,
			outDir: `../../../gradio/templates/${is_cdn ? "cdn" : "frontend"}`
		},
		define: {
			BUILD_MODE: production ? JSON.stringify("prod") : JSON.stringify("dev"),
			BACKEND_URL: production
				? JSON.stringify("")
				: JSON.stringify("http://localhost:7860/")
		},
		css: {
			postcss: {
				plugins: [
					custom_media({
						importFrom: [
							{
								customMedia: {
									"--screen-sm": "(min-width: 640px)",
									"--screen-md": "(min-width: 768px)",
									"--screen-lg": "(min-width: 1024px)",
									"--screen-xl": "(min-width: 1280px)",
									"--screen-xxl": "(min-width: 1536px)"
								}
							}
						]
					})
				]
			}
		},
		plugins: [
			svelte({
				experimental: {
					inspector: true
				},
				compilerOptions: {
					dev: !production
				},
				hot: !process.env.VITEST && !production,
				preprocess: sveltePreprocess({
					postcss: { plugins: [custom_media()] }
				})
			}),
			inject_ejs(),
			patch_dynamic_import({
				mode: is_cdn ? "cdn" : "local",
				gradio_version: GRADIO_VERSION,
				cdn_url: CDN_URL
			}),
			generate_cdn_entry({ enable: is_cdn, cdn_url: CDN_URL }),
			handle_ce_css()
		],
		test: {
			environment: "happy-dom",
			include: ["**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"]
		}
	};
});
