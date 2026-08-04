import type { RichTextContent, RichTextNode } from './types';

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, ' ');

const unwrapText = (node: RichTextNode): string => {
	if (node.type === 'text') return node.text ?? '';
	if (typeof node.children === 'object' && Array.isArray(node.children)) {
		return node.children.map(unwrapText).join(' ');
	}
	if (typeof node.text === 'string') return node.text;
	return '';
};

const renderInline = (node: RichTextNode): string => {
	if (node.type === 'text') {
		let value = escapeHtml(node.text ?? '');
		if (node.code) value = `<code>${value}</code>`;
		if (node.strikethrough) value = `<del>${value}</del>`;
		if (node.underline) value = `<u>${value}</u>`;
		if (node.italic) value = `<em>${value}</em>`;
		if (node.bold) value = `<strong>${value}</strong>`;
		return value;
	}

	if (node.type === 'link') {
		const href = typeof node.url === 'string' ? node.url : '#';
		const children = Array.isArray(node.children) ? node.children.map(renderInline).join('') : '';
		return `<a href="${escapeHtml(href)}" class="text-jade underline decoration-current underline-offset-4">${children}</a>`;
	}

	return Array.isArray(node.children) ? node.children.map(renderInline).join('') : escapeHtml(unwrapText(node));
};

const renderBlock = (node: RichTextNode): string => {
	const children = Array.isArray(node.children) ? node.children.map(renderInline).join('') : '';

	switch (node.type) {
		case 'paragraph':
			return `<p>${children || '&nbsp;'}</p>`;
		case 'heading-one':
			return `<h1>${children}</h1>`;
		case 'heading-two':
			return `<h2>${children}</h2>`;
		case 'heading-three':
			return `<h3>${children}</h3>`;
		case 'heading-four':
			return `<h4>${children}</h4>`;
		case 'heading-five':
			return `<h5>${children}</h5>`;
		case 'heading-six':
			return `<h6>${children}</h6>`;
		case 'quote':
			return `<blockquote>${children}</blockquote>`;
		case 'code': {
			const codeValue = Array.isArray(node.children)
				? node.children.map(unwrapText).join('\n')
				: typeof node.text === 'string'
					? node.text
					: '';
			return `<pre><code>${escapeHtml(codeValue)}</code></pre>`;
		}
		case 'list-item':
			return `<li>${children}</li>`;
		case 'list-ordered':
			return `<ol>${children}</ol>`;
		case 'list-unordered':
			return `<ul>${children}</ul>`;
		case 'image': {
			const imageValue = (node.image ?? {}) as Record<string, unknown>;
			const src = typeof imageValue.url === 'string' ? imageValue.url : '';
			const alt = typeof imageValue.alternativeText === 'string' ? imageValue.alternativeText : typeof imageValue.alt === 'string' ? imageValue.alt : '';
			const caption = typeof node.caption === 'string' ? node.caption : typeof imageValue.caption === 'string' ? imageValue.caption : '';

			if (!src) return '';

			return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
		}
		case 'link':
			return renderInline(node);
		default:
			return children;
	}
};

export const richTextToHtml = (content: RichTextContent | unknown): string => {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content.map(renderBlock).filter(Boolean).join('');
};

export const richTextToText = (content: RichTextContent | unknown): string => {
	if (typeof content === 'string') return stripHtmlTags(content).replace(/\s+/g, ' ').trim();
	if (!Array.isArray(content)) return '';

	return content
		.map((node) => {
			if (node.type === 'image') return '';
			if (Array.isArray(node.children)) return node.children.map(unwrapText).join(' ');
			return typeof node.text === 'string' ? node.text : '';
		})
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
};