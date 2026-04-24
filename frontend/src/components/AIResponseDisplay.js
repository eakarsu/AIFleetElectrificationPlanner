import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIResponseDisplay({ result }) {
  const content = result.recommendation || result.optimization || result.analysis ||
    result.prediction || result.forecast || result.plan || result.calculation ||
    result.response || result.insights || '';

  return (
    <div className="ai-response">
      <div className="ai-response-header">
        <span className="ai-badge">AI RESPONSE</span>
        {result.model && <span className="model-info">Model: {result.model}</span>}
        {result.feature && <span className="model-info">| Feature: {result.feature.name}</span>}
      </div>

      <div className="ai-response-content">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1>{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            h3: ({ children }) => <h3>{children}</h3>,
            p: ({ children }) => <p>{children}</p>,
            ul: ({ children }) => <ul>{children}</ul>,
            ol: ({ children }) => <ol>{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => <strong>{children}</strong>,
            em: ({ children }) => <em>{children}</em>,
            code: ({ inline, children }) =>
              inline ? <code>{children}</code> : <pre><code>{children}</code></pre>,
            blockquote: ({ children }) => <blockquote>{children}</blockquote>,
            table: ({ children }) => <table>{children}</table>,
            thead: ({ children }) => <thead>{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
            hr: () => <hr style={{ border: 'none', borderTop: '1px solid #e0e7ff', margin: '16px 0' }} />
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {result.usage && (
        <div className="ai-usage">
          <span>Prompt tokens: {result.usage.prompt_tokens}</span>
          <span>Completion tokens: {result.usage.completion_tokens}</span>
          <span>Total tokens: {result.usage.total_tokens}</span>
        </div>
      )}
    </div>
  );
}
