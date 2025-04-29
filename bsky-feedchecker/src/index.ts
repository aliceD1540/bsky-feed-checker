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
import { DOMParser } from 'xmldom';

// Define the Env interface to include the D1 binding
interface Env {
	DB: D1Database;
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
		await initializeDatabase(env.DB);

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

		console.log(xmlText);

		// console.log(response.body);

		// xmltextをパースしてtitleとlinkとmedia:thumbnailを取得
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
		const items = xmlDoc.getElementsByTagName('item');

		for (let i = 0; i < items.length; i++) {
			const title = items[i].getElementsByTagName('title')[0].textContent;
			const link = items[i].getElementsByTagName('link')[0].textContent;
			const mediaThumbnail = items[i].getElementsByTagName('media:thumbnail')[0]?.textContent;

			console.log(`Title: ${title}, Link: ${link}, Media Thumbnail: ${mediaThumbnail}`);
		}

		// console.log(`trigger fired at ${event.cron}: ${wasSuccessful}`);
	},
} satisfies ExportedHandler<Env>;

/**
 * Initializes the database by checking for required tables and creating them if they don't exist.
 */
async function initializeDatabase(db: D1Database): Promise<void> {
	// Check if the table exists
	const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='feeds';").first();

	if (!tableCheck) {
		// Create the table if it doesn't exist
		await db
			.prepare(
				`
            CREATE TABLE feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
			)
			.run();

		console.log('Table "feeds" created successfully.');
	} else {
		console.log('Table "feeds" already exists.');
	}
}
