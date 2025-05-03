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

/**
 * articlesテーブルから古いレコードを削除した上でVACUUM、データベースのサイズを最適化する
 * @param db
 */
export async function vacuumDatabase(db: D1Database): Promise<void> {
	// Check if the table exists
	const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles';").first();
	if (tableCheck) {
		// Perform the VACUUM operation
		await db.prepare("DELETE FROM articles WHERE pub_date < datetime('now', '-30 days');").run();
		await db.prepare('VACUUM;').run();
		console.log('Database vacuumed successfully.');
	} else {
		console.log('Table "articles" does not exist, skipping VACUUM.');
	}
}

/**
 * Articlesテーブルを検索し、レコードとして存在しない場合は新規に追加、追加したレコードを返す
 * @param db
 * @param articles
 * @returns {Promise<Articles[]>}
 */
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
				thumbnail: thumbnail ?? null,
				pub_date: pub_date,
			});
		}
	}

	return results;
}
