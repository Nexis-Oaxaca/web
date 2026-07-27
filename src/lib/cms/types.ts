interface StrapiFormat {
  url: string;
  width: number;
  height: number;
}
export interface StrapiMedia {
  id: number;
  documentId: string;
  url: string;
  name: string;
  width: number;
  height: number;
  formats: {
    large?: StrapiFormat;
    medium?: StrapiFormat;
    small?: StrapiFormat;
    thumbnail?: StrapiFormat;
  };
}
export interface ImageRef {
	src: string;
	alt?: string;
}

export interface Speaker {
	name: string;
	role?: string;
	image?: StrapiMedia;
}

export interface EventMedia {
	youtube?: string;
	facebook?: string;
	instagram?: string;
	linkedin?: string;
	twitter?: string;
}

export interface EventItem {
	id: string;
	slug: string;
	title: string;
	description: string;
	registerLink: string;
	date: string;
	time?: string;
	location?: string;
	type?: string;
	status?: string;
	image: string;
	speakers?: Speaker[];
	media?: EventMedia;
	gallery?: string[];
	coverImage?: string;
}

export interface ProjectStat {
	value: string;
	label: string;
}

export interface ProjectTeamMember {
	name: string;
	role: string;
	description: string;
	image: string;
	links: Record<string, string>;
}

export interface ProjectItem {
	id: string;
	slug: string;
	name: string;
	status: string;
	description: string;
	image: string;
	tags: string[];
	challenge: {
		title: string;
		description: string;
		stats: ProjectStat[];
	};
	team: ProjectTeamMember[];
	timeline: Array<{
		step: string | number;
		title: string;
		date: string;
		description: string;
	}>;
	evidence: Array<{
		type: string;
		title: string;
		image: string;
	}>;
	coverImage?: string;
	collaborators?: number;
	icon?: string;
}

export interface StartupStat {
	value: string;
	label: string;
}

export interface StartupTeamMember {
	name: string;
	role: string;
	description: string;
	image: string;
	links: Record<string, string>;
}

export interface StartupItem {
	id: string;
	slug: string;
	name: string;
	industry: string;
	tagline: string;
	description: string;
	image: string;
	banner: string;
	website?: string;
	socials: Record<string, string>;
	founder: {
		name: string;
		role?: string;
		image?: string;
		bio?: string;
	};
	details: {
		whatWeDo: string;
		market: string;
		stats: StartupStat[];
	};
	team: StartupTeamMember[];
	timeline: Array<{
		step: string | number;
		title: string;
		date: string;
		description: string;
	}>;
	evidence: Array<{
		type: string;
		title: string;
		image: string;
	}>;
	coverImage?: string;
}

export interface TeamMember {
	id: string;
	slug: string;
	name: string;
	role: string;
	image: string;
	color: string;
	social: Record<string, string>;
	description?: string;
}

export interface HomeContent {
	events: EventItem[];
	projects: ProjectItem[];
	team: TeamMember[];
}