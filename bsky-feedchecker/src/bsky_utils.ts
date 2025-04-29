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
			return;
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
export async function postMessage(message: string, bsky_username: string, bsky_app_password: string): Promise<void> {
	console.log(`Message: ${message} sent to recipient ID: ${bsky_username}`);

	const response = await fetch('https://api.bsky.social/v1/messages', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${bsky_app_password}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			recipientId: bsky_username,
			message: message,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to send message: ${response.statusText}`);
	}
	console.log('Message sent successfully.');
	return;
}
