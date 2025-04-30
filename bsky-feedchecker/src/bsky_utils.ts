import { AtpAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api';

const agent = new AtpAgent({
	service: 'https://bsky.social',
	persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
		// store the session-data for reuse
	},
});

// Blueskyにログインする
export async function login(bsky_username: string, bsky_app_password: string, session_str?: string | null): Promise<string | void> {
	if (session_str) {
		try {
			// session_strをAtpSessionData型に変換
			const oldSessionData: AtpSessionData = {
				...JSON.parse(session_str),
			};

			await agent.resumeSession(oldSessionData);
			if (agent.session) {
				console.log('Session resumed successfully.');
				return JSON.stringify(agent.session);
			}
		} catch (error) {
			console.error('Error resuming session:', error);
		}
	}

	// セッションがない場合または復元失敗時は新規ログイン
	await agent.login({
		identifier: bsky_username,
		password: bsky_app_password,
	});
	console.log('session:', agent.session);

	// セッションをstringに変換してreturn
	return JSON.stringify(agent.session);
}

// Blueskyに指定されたメッセージをポストする
export async function postMessage(message: string): Promise<void> {
	agent.post({
		$type: 'app.bsky.feed.post',
		text: message,
	});

	return;
}
