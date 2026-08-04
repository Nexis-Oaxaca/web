import type { RichTextContent, RichTextNode } from './types';
import { prefixMediaUrl } from './client';

type RenderState = {
	preview: boolean;
	maxWords: number;
	wordCount: number;
	limitReached: boolean;
};

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, ' ');

const isNode = (value: unknown): value is RichTextNode =>
	Boolean(value && typeof value === 'object' && !Array.isArray(value));

const getNodes = (content: RichTextContent | unknown): RichTextNode[] => {
	if (Array.isArray(content)) return content.filter(isNode);
	if (!content || typeof content !== 'object') return [];

	const value = content as Record<string, unknown>;
	if (Array.isArray(value.children)) return value.children.filter(isNode);
	if (Array.isArray(value.content)) return value.content.filter(isNode);
	if (Array.isArray(value.data)) return value.data.filter(isNode);
	return [];
};

const getChildren = (node: RichTextNode): RichTextNode[] =>
	Array.isArray(node.children) ? node.children.filter(isNode) : [];

const getNodeText = (node: RichTextNode): string => {
	if (typeof node.text === 'string') return node.text;
	return getChildren(node).map(getNodeText).join('');
};

const truncateText = (value: string, state: RenderState): string => {
	if (!state.preview || state.limitReached) return state.limitReached ? '' : value;

	const matches = [...value.matchAll(/\S+/g)];
	const remaining = state.maxWords - state.wordCount;

	if (remaining <= 0) {
		state.limitReached = true;
		return '';
	}

	if (matches.length <= remaining) {
		state.wordCount += matches.length;
		return value;
	}

	const lastWord = matches[remaining - 1];
	state.wordCount = state.maxWords;
	state.limitReached = true;
	return `${value.slice(0, (lastWord.index ?? 0) + lastWord[0].length).trimEnd()}…`;
};

const renderText = (node: RichTextNode, state: RenderState): string => {
	let value = escapeHtml(truncateText(node.text ?? '', state)).replace(/\r?\n/g, '<br />');
	if (!value) return '';

	if (node.code) value = `<code>${value}</code>`;
	if (node.strikethrough) value = `<del>${value}</del>`;
	if (node.underline) value = `<u>${value}</u>`;
	if (node.italic) value = `<em>${value}</em>`;
	if (node.bold) value = `<strong>${value}</strong>`;
	return value;
};

const safeUrl = (value: unknown): string => {
	if (typeof value !== 'string') return '#';
	const url = value.trim();
	return /^(https?:|mailto:|tel:|\/|#|\.\.?\/)/i.test(url) ? url : '#';
};

const renderInline = (node: RichTextNode, state: RenderState): string => {
	if (state.limitReached) return '';
	if (node.type === 'text' || typeof node.text === 'string') return renderText(node, state);

	const children = getChildren(node).map((child) => renderInline(child, state)).join('');

	if (node.type === 'link') {
		const href = safeUrl(node.url);
		const target = node.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
		return `<a href="${escapeHtml(href)}"${target}>${children}</a>`;
	}

	return children;
};

const renderListItem = (node: RichTextNode, state: RenderState): string => {
	const children = getChildren(node);
	const content = children
		.map((child) => {
			if (child.type === 'list') return renderBlock(child, state);
			if (child.type === 'paragraph') return renderInlineChildren(child, state);
			return renderInline(child, state);
		})
		.join('');
	return content ? `<li>${content}</li>` : '';
};

const renderInlineChildren = (node: RichTextNode, state: RenderState): string =>
	getChildren(node).map((child) => renderInline(child, state)).join('');

const renderImage = (node: RichTextNode): string => {
	const image = isNode(node.image) ? node.image : {};
	const rawUrl = typeof image.url === 'string' ? image.url : '';
	if (!rawUrl) return '';

	const src = prefixMediaUrl(rawUrl);
	const alt = typeof image.alternativeText === 'string'
		? image.alternativeText
		: typeof image.alt === 'string'
			? image.alt
			: '';
	const caption = typeof image.caption === 'string'
		? image.caption
		: typeof node.caption === 'string'
			? node.caption
			: '';
	const width = typeof image.width === 'number' ? ` width="${image.width}"` : '';
	const height = typeof image.height === 'number' ? ` height="${image.height}"` : '';

	return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${width}${height} loading="lazy" />${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
};

const renderBlock = (node: RichTextNode, state: RenderState): string => {
	if (state.limitReached || (state.preview && node.type === 'image')) return '';

	const inlineChildren = () => renderInlineChildren(node, state);

	switch (node.type) {
		case 'paragraph': {
			const content = inlineChildren();
			return content ? `<p>${content}</p>` : state.preview ? '' : '<p><br /></p>';
		}
		case 'heading': {
			const level = Math.min(6, Math.max(1, Number(node.level) || 2));
			return `<h${level}>${inlineChildren()}</h${level}>`;
		}
		case 'heading-one':
		case 'heading-two':
		case 'heading-three':
		case 'heading-four':
		case 'heading-five':
		case 'heading-six': {
			const levels = ['one', 'two', 'three', 'four', 'five', 'six'];
			const level = levels.indexOf(node.type.replace('heading-', '')) + 1;
			return `<h${level}>${inlineChildren()}</h${level}>`;
		}
		case 'list':
		case 'list-ordered':
		case 'list-unordered': {
			const ordered = node.type === 'list-ordered' || node.format === 'ordered';
			const tag = ordered ? 'ol' : 'ul';
			const items = getChildren(node).map((item) => renderListItem(item, state)).join('');
			return items ? `<${tag}>${items}</${tag}>` : '';
		}
		case 'list-item':
			return renderListItem(node, state);
		case 'quote':
		case 'blockquote':
			return `<blockquote>${inlineChildren()}</blockquote>`;
		case 'code': {
			const value = truncateText(getNodeText(node), state);
			return value ? `<pre><code>${escapeHtml(value)}</code></pre>` : '';
		}
		case 'image':
			return renderImage(node);
		case 'link':
			return renderInline(node, state);
		default: {
			const children = getChildren(node);
			return children.map((child) => renderBlock(child, state)).join('') || renderInline(node, state);
		}
	}
};

export type RichTextRenderOptions = {
	preview?: boolean;
	maxWords?: number;
};

export const richTextToHtml = (
	content: RichTextContent | unknown,
	options: RichTextRenderOptions = {},
): string => {
	const state: RenderState = {
		preview: options.preview ?? false,
		maxWords: Math.max(0, Math.floor(options.maxWords ?? 30)),
		wordCount: 0,
		limitReached: false,
	};

	if (typeof content === 'string') {
		const value = truncateText(content, state);
		return value ? `<p>${escapeHtml(value).replace(/\r?\n/g, '<br />')}</p>` : '';
	}

	return getNodes(content).map((node) => renderBlock(node, state)).filter(Boolean).join('');
};

export const richTextToText = (content: RichTextContent | unknown): string => {
	if (typeof content === 'string') return stripHtmlTags(content).replace(/\s+/g, ' ').trim();

	return getNodes(content)
		.filter((node) => node.type !== 'image')
		.map(getNodeText)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
};
