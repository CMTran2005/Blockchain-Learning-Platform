import React, { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import { fetchCourses } from '../utils/api';
import { getWeb3PurchasedIds } from '../utils/enrollment';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img skeleton-anim" />
    <div className="skeleton-body">
      <div className="skeleton-line skeleton-anim" style={{ width: '60%' }} />
      <div className="skeleton-line skeleton-anim" style={{ width: '90%', marginTop: 8 }} />
      <div className="skeleton-line skeleton-anim" style={{ width: '40%', marginTop: 8 }} />
    </div>
  </div>
);

const MyCourses = ({ contract, account }) => {
  const { t } = useLanguage();
  const [myCourses, setMyCourses]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [progressData, setProgressData] = useState({});

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!account) { setMyCourses([]); setLoading(false); return; }

      // Fetch all courses from API (with fallback)
      const allCourses = await fetchCourses();

      let purchasedIds = [];

      if (contract) {
        try {
          const checks = allCourses.map(async c => {
            if (!c.web3Purchasable) return null;
            try {
              const ok = await contract.isEnrolled(account, c.id);
              return ok ? c.id : null;
            } catch {
              return null;
            }
          });
          const results = await Promise.all(checks);
          purchasedIds = results.filter(Boolean);
        } catch (e) { console.error(e); }
      }

      const fiat = JSON.parse(localStorage.getItem(`fiat_${account}`) || '[]');
      const web3Local = getWeb3PurchasedIds(account);
      purchasedIds = [...new Set([...purchasedIds, ...fiat, ...web3Local])];

      setMyCourses(allCourses.filter(c => purchasedIds.includes(c.id)));
      setProgressData(JSON.parse(localStorage.getItem(`progress_${account}`) || '{}'));
      setLoading(false);
    };
    fetchMyCourses();
  }, [contract, account]);

  if (!account) return (
    <div className="empty-page">
      <div className="empty-icon">🔗</div>
      <h2>{t("profile_connect_prompt")}</h2>
    </div>
  );

  const totalProgress = myCourses.length > 0
    ? Math.round(myCourses.reduce((sum, c) => sum + (progressData[c.id] || 0), 0) / myCourses.length)
    : 0;

  const completed = myCourses.filter(c => (progressData[c.id] || 0) >= 100).length;

  return (
    <div>
      <div className="page-hero">
        <h1 className="hero-title">{t("my_learning_title")}</h1>
        <p className="hero-subtitle" style={{ marginLeft: 0 }}>{t("my_learning_subtitle")}</p>
      </div>

      {!loading && myCourses.length > 0 && (
        <div className="dashboard-stats">
          <div className="dash-stat">
            <span className="dash-stat-val">{myCourses.length}</span>
            <span className="dash-stat-label">Total Courses</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-val">{myCourses.length - completed}</span>
            <span className="dash-stat-label">In Progress</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-val">{completed}</span>
            <span className="dash-stat-label">Completed</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-val">{totalProgress}%</span>
            <span className="dash-stat-label">Avg Progress</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="courses-grid">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : myCourses.length > 0 ? (
        <div className="courses-grid">
          {myCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              isPurchased={true}
              onBuy={() => {}}
              progress={progressData[course.id] || 0}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-icon">📭</div>
          <h2>{t("my_learning_empty")}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Start learning something new today!</p>
          <Link to="/" className="btn-primary-lg">{t("my_learning_explore")}</Link>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
