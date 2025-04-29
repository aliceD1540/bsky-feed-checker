import { D1Database } from '@cloudflare/workers-types';

/**
 * Initializes the database by checking for required tables and creating them if they don't exist.
 */
export async function initializeDatabase(db: D1Database): Promise<void> {
	// Check if the table exists
	const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='feeds';").first();

	if (!tableCheck) {
		// Create the table if it doesn't exist
		await db
			.prepare(
				`
            CREATE TABLE feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
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

export async function selectFeeds(db: D1Database): Promise<any[]> {
	const feeds = await db.prepare('SELECT * FROM feeds;').all();
	return feeds.results || [];
}

export async function insertFeed(db: D1Database, url: string): Promise<void> {
	await db.prepare('INSERT INTO feeds (url) VALUES (?);').bind(url).run();
}
