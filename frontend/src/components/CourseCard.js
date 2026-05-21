import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const categoryColors = {
  'Programming': { bg: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  'Blockchain':  { bg: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  'AI/ML':       { bg: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  'Security':    { bg: '#ef4444', glow: 'rgba(239,68,68,0.4)'  },
  'Design':      { bg: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  'Marketing':   { bg: '#ec4899', glow: 'rgba(236,72,153,0.4)' },
  'Gaming':      { bg: '#06b6d4', glow: 'rgba(6,182,212,0.4)'  },
  'Finance':     { bg: '#84cc16', glow: 'rgba(132,204,22,0.4)' },
  'Business':    { bg: '#f97316', glow: 'rgba(249,115,22,0.4)' },
};

const CourseCard = ({ course, isPurchased, onBuy, loading, progress }) => {
  const { t } = useLanguage();
  const cat = categoryColors[course.category] || { bg: '#64748b', glow: 'rgba(100,116,139,0.4)' };

  const formatStudents = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n;
  };

  return (
    <div className="course-card">
      <div className="course-card-image-wrap">
        <img src={course.image} alt={course.title} className="course-image" />
        <div className="course-image-overlay" />
        <span className="course-badge" style={{ background: cat.bg }}>
          {course.category}
        </span>
        {isPurchased && (
          <span className="owned-badge">✅ Owned</span>
        )}
      </div>

      <div className="course-content">
        <div className="course-meta">
          <span className="course-rating">⭐ {course.rating}</span>
          <span className="course-duration">⏱ {course.duration}</span>
        </div>

        <h3 className="course-title">{course.title}</h3>
        <div className="course-instructor">By {course.instructor}</div>

        <div className="course-students">
          <span>👥 {formatStudents(course.studentsEnrolled)} students</span>
        </div>

        {progress !== undefined && (
          <div className="progress-wrap">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">
              <span>{t("card_overall_progress")}</span>
              <span className="progress-pct">{progress}%</span>
            </div>
          </div>
        )}

        <div className="course-footer">
          {isPurchased ? (
            <Link to={`/course/${course.id}`} className="btn-purchased" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
              {progress > 0 ? `▶ ${t("card_continue")}` : `🚀 ${t("card_start_learning")}`}
            </Link>
          ) : (
            <div className="course-buy-row">
              <div className="course-price">⟠ {course.priceEth} ETH</div>
              <button
                className="btn-unlock"
                onClick={() => onBuy(course)}
                disabled={loading}
                style={{ '--glow': cat.glow }}
              >
                {loading ? <span className="loader-sm" /> : t("card_unlock")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
