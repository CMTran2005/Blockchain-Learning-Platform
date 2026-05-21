import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useLanguage } from '../context/LanguageContext';

// Fuse.js config — weights each field differently for relevance
const fuseOptions = {
  keys: [
    { name: 'title',       weight: 0.40 },
    { name: 'tags',        weight: 0.35 },
    { name: 'category',    weight: 0.15 },
    { name: 'description', weight: 0.10 },
  ],
  threshold: 0.45,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

const SmartSearch = ({ coursesData, onResultsChange, onQueryChange }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Rebuild Fuse index when coursesData changes
  const fuse = useMemo(() => new Fuse(coursesData || [], fuseOptions), [coursesData]);

  const runSearch = useCallback((q) => {
    if (!q.trim()) {
      onResultsChange(null);
      setSuggestions([]);
      return;
    }

    const results = fuse.search(q);
    const matchedCourses = results.map(r => r.item);
    onResultsChange(matchedCourses);

    setSuggestions(results.slice(0, 5).map(r => ({
      id: r.item.id,
      title: r.item.title,
      category: r.item.category,
      score: Math.round((1 - r.score) * 100),
    })));
  }, [onResultsChange, fuse]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onQueryChange(q);
    setActiveIndex(-1);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(q);
      setShowDropdown(q.trim().length >= 2);
    }, 200);
  };

  const handleSuggestionClick = (course) => {
    setQuery(course.title);
    setShowDropdown(false);
    const found = (coursesData || []).find(c => c.id === course.id);
    onResultsChange(found ? [found] : []);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      handleSuggestionClick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onQueryChange('');
    onResultsChange(null);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoryColors = {
    'Programming': '#3b82f6',
    'Blockchain': '#8b5cf6',
    'AI/ML': '#10b981',
    'Security': '#ef4444',
    'Design': '#f59e0b',
    'Marketing': '#ec4899',
    'Gaming': '#06b6d4',
    'Finance': '#84cc16',
    'Business': '#f97316',
  };

  return (
    <div className="smart-search-wrapper" ref={dropdownRef}>
      <div className="smart-search-bar">
        <span className="search-icon-ai">✨</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={t("home_search_placeholder")}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
          autoComplete="off"
        />
        {query && (
          <button className="search-clear-btn" onClick={handleClear} title="Clear search">×</button>
        )}
        {query.trim().length >= 2 && (
          <span className="search-ai-badge">AI</span>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="search-dropdown">
          <div className="search-dropdown-header">
            ✨ AI Suggestions — {suggestions.length} results
          </div>
          {suggestions.map((s, idx) => (
            <div
              key={s.id}
              className={`search-suggestion-item ${activeIndex === idx ? 'active' : ''}`}
              onClick={() => handleSuggestionClick(s)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className="suggestion-title">{s.title}</div>
              <div className="suggestion-meta">
                <span className="suggestion-category" style={{ background: categoryColors[s.category] || '#64748b' }}>
                  {s.category}
                </span>
                <span className="suggestion-match">
                  {s.score}% match
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="search-dropdown">
          <div className="search-no-results">
            No courses found for "<strong>{query}</strong>" — try different keywords
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
