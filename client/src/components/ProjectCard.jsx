import { Link } from 'react-router-dom';

export default function ProjectCard({ project, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <Link to={`/projects/${project.id}`} className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
            {project.name}
          </Link>
          <p className="mt-1 text-sm text-gray-500 truncate">{project.wp_api_url}</p>
          <p className="mt-1 text-xs text-gray-400">
            User: {project.wp_username}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <Link
            to={`/projects/${project.id}/edit`}
            className="text-sm px-3 py-1 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(project)}
            className="text-sm px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
