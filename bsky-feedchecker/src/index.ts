/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your Worker in action
 * - Run `npm run deploy` to publish your Worker
 *
 * Bind resources to your Worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { D1Database } from '@cloudflare/workers-types'; // Ensure you have the correct type for D1
import { KVNamespace } from '@cloudflare/workers-types';
import { DOMParser } from 'xmldom';
import * as db from './db';
import * as bsky_utils from './bsky_utils';
import { Articles, Feeds } from 'data-models';

// Define the Env interface to include the D1 binding
interface Env {
	DB: D1Database;
	KV: KVNamespace;
	BSKY_USERNAME: string;
	BSKY_APP_PASSWORD: string;
}

export default {
	async fetch(req) {
		const url = new URL(req.url);
		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {
		// Initialize the database
		console.log('env.DB:', env.DB);
		console.log('BSKY_USERNAME:', env.BSKY_USERNAME);
		const old_session = await env.KV.get(env.BSKY_USERNAME, 'text');
		const session_str = await bsky_utils.login(env.BSKY_USERNAME, env.BSKY_APP_PASSWORD, old_session);
		// パスワード認証を行った場合はKVに取得したセッションを保存する
		if (session_str && session_str !== old_session) {
			env.KV.put(env.BSKY_USERNAME, session_str);
		}

		await db.initializeDatabase(env.DB);

		// Example API call
		// let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
		// let wasSuccessful = resp.ok ? 'success' : 'fail';

		// RSSを取得
		const rssUrl = 'https://note.com/project_grimoire/rss';
		const response = await fetch(rssUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
		}
		const xmlText = await response.text();

		// console.log(xmlText);

		// console.log(response.body);

		// xmltextをパースしてtitleとlinkとmedia:thumbnailを取得
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
		const items = xmlDoc.getElementsByTagName('item');

		// itemsをmodels.Articles型に変換
		const articles: Articles[] = [];
		for (let i = 0; i < items.length; i++) {
			const title = items[i].getElementsByTagName('title')[0].textContent;
			const link = items[i].getElementsByTagName('link')[0].textContent;
			const mediaThumbnail = items[i].getElementsByTagName('media:thumbnail')[0]?.textContent;
			const pubDate = items[i].getElementsByTagName('pubDate')[0]?.textContent
				? parseDate(items[i].getElementsByTagName('pubDate')[0].textContent!)
				: null;

			if (title && link && pubDate) {
				articles.push({
					id: null,
					feed_id: 1, // あくまで将来的に使用するカラムなので仮のIDを設定
					title: title,
					link: link,
					thumbnail: mediaThumbnail ?? null,
					pub_date: pubDate,
				});
			}
		}
		// DBからitemsを検索、存在しないitemを取得＆DBに保存
		const notExists = await db.checkItemExists(env.DB, articles);
		console.log('notExists:', notExists);

		// bsky_utils.postMessage('test');

		// console.log(`trigger fired at ${event.cron}: ${wasSuccessful}`);
	},
} satisfies ExportedHandler<Env>;

// 日付を文字列からDateオブジェクトに変換
function parseDate(dateString: string): Date {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid date string: ${dateString}`);
	}
	return date;
}
