import type {
	EventItem,
	HomeContent,
	RichTextContent,
	ProjectItem,
	StartupItem,
	TeamMember,
} from './types';
import { prefixMediaUrl } from './client';
import { rawEvents, rawProjects, rawStartups, rawTeam } from './local-data';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

export const resolveMediaUrl = (value: unknown, baseUrl?: string): string => {
	if (!value) return '';
	if (typeof value === 'string') return value;

	if (Array.isArray(value)) {
		return resolveMediaUrl(value[0], baseUrl);
	}

	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		if (obj.data !== undefined) return resolveMediaUrl(obj.data, baseUrl);
		if (typeof obj.url === 'string') return prefixMediaUrl(obj.url, baseUrl);
		if (obj.attributes && typeof obj.attributes === 'object') {
			return resolveMediaUrl((obj.attributes as Record<string, unknown>).url, baseUrl);
		}
	}

	return '';
};

export const resolveMediaList = (value: unknown, baseUrl?: string): string[] => {
	if (!value) return [];
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) {
		return value.map((item) => resolveMediaUrl(item, baseUrl)).filter(Boolean);
	}
	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		if (Array.isArray(obj.data)) {
			return obj.data.map((item) => resolveMediaUrl(item, baseUrl)).filter(Boolean);
		}
	}
	return [];
};

const normalizeLinks = (links: unknown): Record<string, string> => {
	if (!links || typeof links !== 'object' || Array.isArray(links)) return {};
	return Object.fromEntries(
		Object.entries(links as Record<string, unknown>).filter(([, url]) => typeof url === 'string'),
	) as Record<string, string>;
};

const normalizeRichTextContent = (value: unknown): RichTextContent => {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value as RichTextContent;
	if (value && typeof value === 'object') return value as RichTextContent;
	return '';
};

const normalizeSpeakers = (speakers: unknown, baseUrl?: string) => {
	if (!Array.isArray(speakers)) return [];
	return speakers.map((speaker) => {
		const item = speaker as Record<string, unknown>;
		return {
			name: String(item.name ?? ''),
			role: item.role ? String(item.role) : undefined,
			image: resolveMediaUrl(item.image, baseUrl),
		};
	});
};

const normalizeStats = (stats: unknown) => {
	if (!Array.isArray(stats)) return [];
	return stats.map((stat) => {
		const item = stat as Record<string, unknown>;
		return {
			value: String(item.value ?? ''),
			label: String(item.label ?? ''),
		};
	});
};

const normalizeTimeline = (timeline: unknown) => {
	if (!Array.isArray(timeline)) return [];
	return timeline.map((entry) => {
		const item = entry as Record<string, unknown>;
		return {
			step: item.step ?? '',
			title: String(item.title ?? ''),
			date: String(item.date ?? ''),
			description: String(item.description ?? ''),
		};
	});
};

const normalizeEvidence = (evidence: unknown, baseUrl?: string) => {
	if (!Array.isArray(evidence)) return [];
	return evidence.map((entry) => {
		const item = entry as Record<string, unknown>;
		return {
			type: String(item.type ?? ''),
			title: String(item.title ?? ''),
			image: resolveMediaUrl(item.image, baseUrl),
		};
	});
};

const normalizeProjectTeam = (team: unknown, baseUrl?: string) => {
	if (!Array.isArray(team)) return [];
	return team.map((member) => {
		const item = member as Record<string, unknown>;
		return {
			name: String(item.name ?? ''),
			role: String(item.role ?? ''),
			description: String(item.description ?? ''),
			image: resolveMediaUrl(item.image, baseUrl),
			links: normalizeLinks(item.links ?? item.social),
		};
	});
};

export const normalizeEvent = (event: Record<string, unknown>, baseUrl?: string): EventItem => {
	const slug = String(event.slug ?? event.id ?? '');
	const image = resolveMediaUrl(event.image ?? event.coverImage, baseUrl);

	return {
		id: String(event.id ?? slug),
		slug,
		title: String(event.title ?? ''),
		description: normalizeRichTextContent(event.description),
		registerLink: String(event.registerLink ?? ''),
		date: String(event.date ?? ''),
		location: event.location ? String(event.location) : undefined,
		type: event.type ? String(event.type) : undefined,
		status: event.eventStatus ? String(event.eventStatus) : undefined,
		image,
		speakers: normalizeSpeakers(event.speakers, baseUrl),
		media: (event.media && typeof event.media === 'object' && !Array.isArray(event.media)
			? Object.fromEntries(
					Object.entries(event.media as Record<string, unknown>).filter(
						([, url]) => typeof url === 'string',
					),
				)
			: {}) as EventItem['media'],
		gallery: resolveMediaList(event.gallery ?? event.galery, baseUrl),
		coverImage: resolveMediaUrl(event.coverImage ?? event.image, baseUrl) || image,
	};
};

export const normalizeProject = (project: Record<string, unknown>, baseUrl?: string): ProjectItem => {
	const slug = String(project.slug ?? project.id ?? '');
	const image = resolveMediaUrl(project.image ?? project.coverImage, baseUrl);
	const challenge =
		project.challenge && typeof project.challenge === 'object' && !Array.isArray(project.challenge)
			? (project.challenge as Record<string, unknown>)
			: {};

	return {
		id: String(project.id ?? slug),
		slug,
		name: String(project.name ?? ''),
		status: String(project.projectStatus ?? ''),
		description: String(project.description ?? ''),
		image,
		tags: Array.isArray(project.tags) ? project.tags.map(String) : [],
		challenge: {
			title: String(challenge.title ?? ''),
			description: String(challenge.description ?? ''),
			stats: normalizeStats(challenge.stats),
		},
		team: normalizeProjectTeam(project.team, baseUrl),
		timeline: normalizeTimeline(project.timeline),
		evidence: normalizeEvidence(project.evidence, baseUrl),
		coverImage: resolveMediaUrl(project.coverImage ?? project.image, baseUrl) || image,
		collaborators:
			typeof project.collaborators === 'number' ? project.collaborators : undefined,
		icon: project.icon ? String(project.icon) : undefined,
	};
};

export const normalizeStartup = (startup: Record<string, unknown>, baseUrl?: string): StartupItem => {
	const slug = String(startup.slug ?? startup.id ?? '');
	const image = resolveMediaUrl(startup.image ?? startup.logo, baseUrl);
	const banner = resolveMediaUrl(startup.banner ?? startup.coverImage ?? startup.image, baseUrl);
	const founder =
		startup.founder && typeof startup.founder === 'object' && !Array.isArray(startup.founder)
			? (startup.founder as Record<string, unknown>)
			: {};
	const details =
		startup.details && typeof startup.details === 'object' && !Array.isArray(startup.details)
			? (startup.details as Record<string, unknown>)
			: {};

	return {
		id: String(startup.id ?? slug),
		slug,
		name: String(startup.name ?? ''),
		industry: String(startup.industry ?? ''),
		tagline: String(startup.tagline ?? ''),
		description: String(startup.description ?? ''),
		image,
		banner: banner || image,
		website: startup.website ? String(startup.website) : undefined,
		socials: normalizeLinks(startup.socials),
		founder: {
			name: String(founder.name ?? ''),
			role: founder.role ? String(founder.role) : undefined,
			image: resolveMediaUrl(founder.image, baseUrl) || undefined,
			bio: founder.bio ? String(founder.bio) : undefined,
		},
		details: {
			whatWeDo: String(details.whatWeDo ?? ''),
			market: String(details.market ?? ''),
			stats: normalizeStats(details.stats),
		},
		team: normalizeProjectTeam(startup.team, baseUrl),
		timeline: normalizeTimeline(startup.timeline),
		evidence: normalizeEvidence(startup.evidence, baseUrl),
		coverImage: resolveMediaUrl(startup.coverImage ?? startup.banner, baseUrl) || banner,
	};
};

export const normalizeTeamMember = (
	member: Record<string, unknown>,
	index = 0,
	baseUrl?: string,
): TeamMember => {
	const name = String(member.name ?? '');
	const slug = String(member.slug ?? member.id ?? (name ? slugify(name) : index));

	return {
		id: String(member.id ?? slug),
		slug,
		name,
		role: String(member.role ?? ''),
		image: resolveMediaUrl(member.image, baseUrl),
		color: String(member.color ?? 'bg-jade'),
		social: normalizeLinks(member.social ?? member.links),
		description: member.description ? String(member.description) : undefined,
	};
};

export const localEvents = (rawEvents as Record<string, unknown>[]).map((event) => normalizeEvent(event));
export const localProjects = (rawProjects as Record<string, unknown>[]).map((project) =>
	normalizeProject(project),
);
export const localStartups = (rawStartups as Record<string, unknown>[]).map((startup) =>
	normalizeStartup(startup),
);
export const localTeam = (rawTeam as Record<string, unknown>[]).map((member, index) =>
	normalizeTeamMember(member, index),
);

export const localHomeContent: HomeContent = {
	events: localEvents,
	projects: localProjects,
	team: localTeam,
};
