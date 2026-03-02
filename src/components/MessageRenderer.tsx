import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

export function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUser && contentRef.current) {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      const html = marked(content);
      const sanitized = DOMPurify.sanitize(html as string, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
      });
      contentRef.current.innerHTML = sanitized;
    }
  }, [content, isUser]);

  if (isUser) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return (
    <div
      ref={contentRef}
      className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-primary-600 dark:prose-code:text-primary-400"
      style={{
        wordBreak: 'break-word',
      }}
    />
  );
}
