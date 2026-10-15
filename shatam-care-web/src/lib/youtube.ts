// Minimal YouTube IFrame Player API loader. Audio-track language switching is
// a manual, player-UI-only action (no programmatic API — see PLAN.md 3.2 /
// SCHEMA.md), so this only handles what we DO control: embedding, playback
// state, and current time for checkpoint triggering.
//
// `YT` below is an ambient type describing the global `window.YT` object the
// external youtube.com/iframe_api script injects at runtime — it has no
// implementation of its own, so it can't accidentally be instantiated in
// place of the real player.

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace YT {
	class Player {
		constructor(elementId: string, options: PlayerOptions);
		getCurrentTime(): number;
		getDuration(): number;
		pauseVideo(): void;
		playVideo(): void;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		destroy(): void;
	}
	interface PlayerOptions {
		videoId: string;
		playerVars?: Record<string, unknown>;
		events?: {
			onReady?: (event: { target: Player }) => void;
			onStateChange?: (event: { data: number; target: Player }) => void;
		};
	}
	const PlayerState: {
		ENDED: number;
		PLAYING: number;
		PAUSED: number;
	};
}

declare global {
	interface Window {
		YT: typeof YT;
		onYouTubeIframeAPIReady: () => void;
	}
}

export type YouTubePlayer = YT.Player;

let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
	if (apiLoadPromise) return apiLoadPromise;
	apiLoadPromise = new Promise((resolve) => {
		if (window.YT?.Player) {
			resolve();
			return;
		}
		window.onYouTubeIframeAPIReady = () => resolve();
		const script = document.createElement("script");
		script.src = "https://www.youtube.com/iframe_api";
		document.body.appendChild(script);
	});
	return apiLoadPromise;
}

export function createPlayer(
	elementId: string,
	videoId: string,
	events: YT.PlayerOptions["events"],
): YouTubePlayer {
	// `host` is a real YT.Player option (privacy-enhanced embed) but is missing
	// from @types/youtube's PlayerOptions, so the options are typed with it
	// added explicitly.
	const options: YT.PlayerOptions & { host?: string } = {
		videoId,
		// Privacy-enhanced domain: YouTube serves no ad-tracking / conversion
		// pixels from here (the browser was blocking those anyway, flooding the
		// console with CORS errors) and sets no tracking cookies until the
		// learner actually plays — a better fit for low-data, privacy-sensitive
		// caregivers than the default youtube.com embed.
		host: "https://www.youtube-nocookie.com",
		playerVars: {
			rel: 0,
			// Lets the IFrame API address our window for postMessage, quieting
			// the "Unable to post message … origin http://localhost:3000" warning.
			origin: typeof window !== "undefined" ? window.location.origin : undefined,
		},
		events,
	};
	return new window.YT.Player(elementId, options);
}

export function getPlayerState() {
	return window.YT.PlayerState;
}

export function extractYouTubeId(urlOrId: string): string {
	const match = urlOrId.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
	return match ? match[1] : urlOrId;
}
