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
		// session_strをAtpSessionData型に変換
		const oldSessionData: AtpSessionData = {
			...JSON.parse(session_str),
		};

		await agent.resumeSession(oldSessionData);
		if (agent.session) {
			console.log('Session resumed successfully.');
			return JSON.stringify(agent.session);
		}
	}

	// セッションがない場合は新規ログイン
	await agent.login({
		identifier: bsky_username,
		password: bsky_app_password,
	});
	console.log('session:', agent.session);

	// セッションをstringに変換してreturn
	return JSON.stringify(agent.session);
}

// セッションを復元する
export async function resumeSession(savedSession: AtpSessionData): Promise<void> {
	const session = await agent.resumeSession(savedSession);
	if (session) {
		console.log('Session resumed successfully.');
	} else {
		console.log('Failed to resume session.');
	}
}

// Blueskyに指定されたメッセージをポストする
export async function postMessage(message: string): Promise<void> {
	agent.post({
		$type: 'app.bsky.feed.post',
		text: message,
	});

	return;
}
