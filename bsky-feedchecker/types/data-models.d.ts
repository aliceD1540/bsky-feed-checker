declare module 'data-models' {
	export interface Articles {
		id: number | null;
		feed_id: number;
		title: string;
		link: string;
		thumbnail: string | null;
		pub_date: Date;
	}
	export interface Feeds {
		id: number;
		url: string;
		title: string;
		last_checked: Date;
	}
}
