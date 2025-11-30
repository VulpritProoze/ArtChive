import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import type { FellowSearchParams } from '@types';

interface FellowsSearchBarProps {
  onSearch: (params: FellowSearchParams) => void;
}

export default function FellowsSearchBar({ onSearch }: FellowsSearchBarProps) {
  const [query, setQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'username' | 'name' | 'artist_type'>('username');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ q: query.trim(), filter_by: filterBy });
  };

  const handleClear = () => {
    setQuery('');
    onSearch({ q: '', filter_by: filterBy });
  };

  return (
    <div className="bg-base-200/50 rounded-xl p-4 border border-base-300">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 w-4 h-4"
          />
          <input
            type="text"
            placeholder="Search fellows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-base-100 rounded-lg border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <select
          value={filterBy}
          onChange={(e) => {
            const newFilter = e.target.value as 'username' | 'name' | 'artist_type';
            setFilterBy(newFilter);
            if (query.trim()) {
              onSearch({ q: query.trim(), filter_by: newFilter });
            }
          }}
          className="px-4 py-2 bg-base-100 rounded-lg border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
        >
          <option value="username">Username</option>
          <option value="name">Name</option>
          <option value="artist_type">Artist Type</option>
        </select>

        {/* Search Button */}
        <button
          type="submit"
          className="btn btn-primary px-6 text-sm"
        >
          Search
        </button>

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-ghost px-6 text-sm"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

