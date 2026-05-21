import React, { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import PaymentModal from '../components/PaymentModal';
import SmartSearch from '../components/SmartSearch';
import { fetchCourses } from '../utils/api';
import { fetchOnChainCourse, purchaseCourseOnChain, getWeb3PaymentErrorMessage } from '../utils/web3Payment';
import { markWeb3Purchased, isWeb3PurchasedLocally } from '../utils/enrollment';
import { useLanguage } from '../context/LanguageContext';

const STATS = [
  { icon: '📚', value: '20+',   label: 'Premium Courses' },
  { icon: '👥', value: '150K+', label: 'Students Enrolled' },
  { icon: '⛓️', value: '100%',  label: 'Blockchain Verified' },
  { icon: '🏆', value: '4.8★',  label: 'Average Rating' },
];

const Home = ({ contract, account, showToast }) => {
  const { t } = useLanguage();
  const [coursesData, setCoursesData]       = useState([]);
  const [purchasedIds, setPurchasedIds]     = useState([]);
  const [loadingId, setLoadingId]           = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchResults, setSearchResults]   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');

  // Fetch courses from API (with fallback)
  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const data = await fetchCourses();
        setCoursesData(data);
      } catch (e) {
        console.error('Failed to load courses:', e);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  const categories = ['All', ...new Set(coursesData.map(c => c.category))];

  useEffect(() => {
    const fetchPurchased = async () => {
      if (contract && account && coursesData.length > 0) {
        try {
          const checks = coursesData.map(async c => {
            if (isWeb3PurchasedLocally(account, c.id)) return c.id;
            if (!c.web3Purchasable) return null;
            try {
              const ok = await contract.isEnrolled(account, c.id);
              if (ok) markWeb3Purchased(account, c.id);
              return ok ? c.id : null;
            } catch {
              return null;
            }
          });
          const results = await Promise.all(checks);
          setPurchasedIds(results.filter(Boolean));
        } catch (e) { console.error(e); }
      } else {
        setPurchasedIds([]);
      }
    };
    fetchPurchased();
  }, [contract, account, coursesData]);

  const handleBuyClick = async (course) => {
    if (!account) { showToast('Please connect your wallet first', 'error'); return; }
    if (!course.web3Purchasable) {
      showToast('This course is not registered on blockchain yet. Use Fiat or ask admin.', 'error');
      return;
    }

    let courseForModal = course;
    if (contract) {
      try {
        const onChain = await fetchOnChainCourse(contract, course.id);
        courseForModal = { ...course, priceEth: onChain.priceEth };
      } catch (e) {
        showToast(getWeb3PaymentErrorMessage(e), 'error');
        return;
      }
    }

    setSelectedCourse(courseForModal);
    setPaymentModalOpen(true);
  };

  const executeWeb3Payment = async () => {
    if (!contract || !selectedCourse) return;

    try {
      setLoadingId(selectedCourse.id);
      showToast('Confirm transaction in MetaMask...', 'info');

      const { courseId, priceEth } = await purchaseCourseOnChain(contract, selectedCourse);
      markWeb3Purchased(account, courseId);

      showToast(`Purchased for ${priceEth} ETH!`, 'success');
      setPurchasedIds(prev => [...prev, courseId]);
      setPaymentModalOpen(false);
    } catch (err) {
      console.error('Web3 payment error:', err);
      showToast(getWeb3PaymentErrorMessage(err), 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const executeFiatPayment = async () => {
    if (!selectedCourse) return;
    setLoadingId(selectedCourse.id);
    setTimeout(() => {
      const fp = JSON.parse(localStorage.getItem(`fiat_${account}`) || '[]');
      if (!fp.includes(selectedCourse.id)) {
        fp.push(selectedCourse.id);
        localStorage.setItem(`fiat_${account}`, JSON.stringify(fp));
      }
      showToast('Payment successful via Credit Card/Momo!', 'success');
      setPurchasedIds(prev => [...prev, selectedCourse.id]);
      setPaymentModalOpen(false);
      setLoadingId(null);
    }, 2000);
  };

  const displayedCourses = (() => {
    let base = searchResults !== null ? searchResults : coursesData;
    if (activeCategory !== 'All') base = base.filter(c => c.category === activeCategory);
    return base;
  })();

  // Skeleton loading cards
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

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">✨ Web3-Powered Learning Platform</div>
        <h1 className="hero-title">
          Learn the <span className="gradient-text">Future of Web3</span>
        </h1>
        <p className="hero-subtitle">{t("home_hero_subtitle")}</p>

        <div className="hero-stats">
          {STATS.map(s => (
            <div key={s.label} className="hero-stat">
              <span className="hero-stat-icon">{s.icon}</span>
              <strong className="hero-stat-value">{s.value}</strong>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="discovery-tools">
        <SmartSearch
          coursesData={coursesData}
          onResultsChange={setSearchResults}
          onQueryChange={setSearchQuery}
        />
        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' ? t("home_all") : cat}
            </button>
          ))}
        </div>
      </div>

      {searchQuery.trim().length >= 2 && searchResults !== null && (
        <div className="search-result-info">
          ✨ Found <strong>{displayedCourses.length}</strong> result{displayedCourses.length !== 1 ? 's' : ''} for "<em>{searchQuery}</em>"
        </div>
      )}

      {/* Grid */}
      <div className="courses-grid">
        {loadingCourses ? (
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          displayedCourses.map((course, i) => {
            const fiat = JSON.parse(localStorage.getItem(`fiat_${account}`) || '[]');
            const isPurchased = purchasedIds.includes(course.id) || fiat.includes(course.id);
            return (
              <div key={course.id} className="card-appear" style={{ animationDelay: `${i * 60}ms` }}>
                <CourseCard
                  course={course}
                  isPurchased={isPurchased}
                  onBuy={handleBuyClick}
                  loading={loadingId === course.id}
                />
              </div>
            );
          })
        )}
        {!loadingCourses && displayedCourses.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">🔍</div>
            <h3>{t("home_no_courses")}</h3>
          </div>
        )}
      </div>

      {paymentModalOpen && selectedCourse && (
        <PaymentModal
          course={selectedCourse}
          onClose={() => { if (!loadingId) setPaymentModalOpen(false); }}
          onPayWeb3={executeWeb3Payment}
          onPayFiat={executeFiatPayment}
          loading={loadingId === selectedCourse.id}
        />
      )}
    </div>
  );
};

export default Home;
