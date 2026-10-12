import React from 'react';
import AIResultView from '../pages/AIResultView';

export default function AIResponseDisplay({ result }) {
  return <AIResultView response={result} title="AI response" />;
}
