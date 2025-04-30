import { D1Database } from '@cloudflare/workers-types';
import { Articles, Feeds } from 'data-models';

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
            CREATE TABLE articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feed_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                link VARCHAR(255) NOT NULL,
                thumbnail VARCHAR(255),
                pub_date TIMESTAMP NOT NULL
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

// Articlesテーブルを検索し、レコードとして存在しない場合は新規に追加、追加したレコードを返す
export async function checkItemExists(db: D1Database, articles: Articles[]): Promise<Articles[]> {
	const results: Articles[] = [];
	const links = articles.map((article) => article.link);

	// 既存の記事を一括で取得
	const existingArticles = await db
		.prepare(`SELECT link FROM articles WHERE link IN (${links.map(() => '?').join(',')});`)
		.bind(...links)
		.all();

	const existingLinks = new Set((existingArticles.results as { link: string }[]).map((row) => row.link));

	// 既存でない記事を挿入
	for (const article of articles) {
		if (!existingLinks.has(article.link)) {
			const { feed_id, title, link, thumbnail, pub_date } = article;
			// pub_dateはDate型なので文字列に変換して保存
			const pub_date_str = typeof pub_date === 'string' ? pub_date : pub_date.toISOString();
			await db
				.prepare('INSERT INTO articles (feed_id, title, link, thumbnail, pub_date) VALUES (?, ?, ?, ?, ?);')
				.bind(feed_id, title, link, thumbnail, pub_date_str)
				.run();
			results.push({
				id: null,
				feed_id: feed_id,
				title: title,
				link: link,
				thumbnail: thumbnail,
				pub_date: pub_date,
			});
		}
	}

	return results;
}
