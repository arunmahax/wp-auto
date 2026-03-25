import { useState, useEffect, useRef } from 'react';
import client from '../api/client';

const PIPELINE_STEPS = [
  { key: 'image_generation', label: 'Image Generation', icon: '🖼️', desc: 'Generating 4 Midjourney images via TTAPI' },
  { key: 'image_upload', label: 'Image Upload', icon: '☁️', desc: 'Uploading images to WordPress media library' },
  { key: 'article_generation', label: 'Article Generation', icon: '📝', desc: 'Generating article via Content Writer' },
  { key: 'publishing', label: 'WordPress Publish', icon: '🌐', desc: 'Publishing post, recipe card & SEO' },
  { key: 'pin_generation', label: 'Pin Generation', icon: '📌', desc: 'Creating Pinterest pin image' },
  { key: 'pin_submission', label: 'Pin Submission', icon: '📤', desc: 'Submitting pin to Pinterest board' },
];

function getStepIndex(step) {
  if (!step || step === 'starting') return -1;
  if (step === 'done') return PIPELINE_STEPS.length;
  return PIPELINE_STEPS.findIndex((s) => s.key === step);
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function PipelineTracker({ projectId, job, onUpdate }) {
  const [pipeline, setPipeline] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const isActive = job.status === 'pending' || job.status === 'running';

  useEffect(() => {
    fetchPipeline();

    if (isActive) {
      intervalRef.current = setInterval(fetchPipeline, 3000);
      startTimeRef.current = new Date(job.createdAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 1000);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [job.id, job.status]);

  async function fetchPipeline() {
    try {
      const { data } = await client.get(`/projects/${projectId}/jobs/${job.id}/pipeline`);
      setPipeline(data);
      if ((data.status === 'completed' || data.status === 'failed') && isActive) {
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
        if (onUpdate) onUpdate();
      }
    } catch {
      // ignore poll errors
    }
  }

  const status = pipeline?.status || job.status;
  const currentStep = pipeline?.pipeline_step || job.pipeline_step;
  const currentIdx = getStepIndex(currentStep);
  const isFailed = status === 'failed';
  const isDone = status === 'completed';
  const recipe = pipeline?.recipe;
  const resultData = pipeline?.result_data;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}
          <span className={`text-sm font-semibold ${
            isDone ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-blue-700'
          }`}>
            {isDone ? '✓ Pipeline Complete' : isFailed ? '✗ Pipeline Failed' : 'Pipeline Running...'}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {formatDuration(isDone || isFailed
            ? new Date(pipeline?.updatedAt || job.updatedAt).getTime() - new Date(job.createdAt).getTime()
            : elapsed
          )}
        </span>
      </div>

      {/* Recipe title */}
      {recipe && (
        <div className="mb-4 px-3 py-2 bg-gray-50 rounded text-sm text-gray-700">
          <span className="text-gray-400 text-xs">Recipe:</span>{' '}
          <span className="font-medium">{recipe.title}</span>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = isDone ? true : currentIdx > idx;
          const isCurrent = currentIdx === idx && !isDone;
          const isFailedStep = isFailed && currentIdx === idx;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div key={step.key} className="flex items-center gap-3 py-2 px-3 rounded-md transition-colors"
              style={{
                backgroundColor: isCurrent ? '#eff6ff' : isFailedStep ? '#fef2f2' : isCompleted ? '#f0fdf4' : 'transparent',
              }}
            >
              {/* Step indicator */}
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isFailedStep ? 'bg-red-500 border-red-500 text-white' :
                isCurrent ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                'bg-white border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? '✓' : isFailedStep ? '✗' : idx + 1}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  isCompleted ? 'text-green-700' :
                  isFailedStep ? 'text-red-700' :
                  isCurrent ? 'text-blue-700' :
                  'text-gray-400'
                }`}>
                  {step.icon} {step.label}
                </div>
                {(isCurrent || isFailedStep) && (
                  <div className={`text-xs mt-0.5 ${isFailedStep ? 'text-red-500' : 'text-blue-500'}`}>
                    {isFailedStep ? pipeline?.error_message || recipe?.error_message || 'Unknown error' : step.desc}
                  </div>
                )}
              </div>

              {/* Status indicator for current */}
              {isCurrent && !isFailedStep && (
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result info */}
      {isDone && resultData && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm space-y-1">
          {resultData.published_url && (
            <div>
              <span className="text-green-600 font-medium">Published:</span>{' '}
              <a href={resultData.published_url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 underline hover:text-indigo-500 break-all">
                {resultData.published_url}
              </a>
            </div>
          )}
          {resultData.post_id && (
            <div className="text-green-600">Post ID: #{resultData.post_id}</div>
          )}
        </div>
      )}

      {/* Pin submission details */}
      {isDone && (resultData?.pin_image_url || recipe?.pin_image_url) && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md text-sm space-y-2">
          <div className="text-xs text-purple-500 font-semibold uppercase tracking-wide">Pin Submitted to RSS Feed</div>
          <div className="flex gap-3">
            <img
              src={resultData?.pin_image_url || recipe?.pin_image_url}
              alt="Pinterest pin"
              className="h-36 w-auto rounded border border-purple-200 flex-shrink-0 object-contain"
            />
            <div className="flex-1 min-w-0 space-y-1">
              {(resultData?.pin_title || recipe?.pinterest_title) && (
                <div>
                  <span className="text-purple-600 font-medium text-xs">Title:</span>
                  <div className="text-gray-800 font-medium text-sm">{resultData?.pin_title || recipe?.pinterest_title}</div>
                </div>
              )}
              {(resultData?.pin_description || recipe?.pinterest_description) && (
                <div>
                  <span className="text-purple-600 font-medium text-xs">Description:</span>
                  <div className="text-gray-600 text-xs leading-relaxed">{resultData?.pin_description || recipe?.pinterest_description}</div>
                </div>
              )}
              {recipe?.pinterest_board && (
                <div className="text-xs text-purple-500">Board: {recipe.pinterest_board}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error info */}
      {isFailed && !currentStep && pipeline?.error_message && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {pipeline.error_message}
        </div>
      )}

      {/* Image previews */}
      {recipe?.mj_images?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-400 mb-2">Generated Images</div>
          <div className="flex gap-2 overflow-x-auto">
            {recipe.mj_images.map((url, i) => (
              <img key={i} src={url} alt={`Generated ${i + 1}`}
                className="h-16 w-28 object-cover rounded border border-gray-200 flex-shrink-0" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
