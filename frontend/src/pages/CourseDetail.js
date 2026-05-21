import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourseById, fetchLessonsByCourse } from '../utils/api';
import PaymentModal from '../components/PaymentModal';
import CourseVideoPlayer from '../components/CourseVideoPlayer';
import { purchaseCourseOnChain, fetchOnChainCourse, getWeb3PaymentErrorMessage } from '../utils/web3Payment';
import { isWeb3PurchasedLocally, markWeb3Purchased } from '../utils/enrollment';
import { useLanguage } from '../context/LanguageContext';

const defaultSyllabus = [
  { title: 'Introduction & Setup',    duration: '45 min' },
  { title: 'Core Concepts',           duration: '1h 20m' },
  { title: 'Advanced Techniques',     duration: '2h 15m' },
  { title: 'Building the Project',    duration: '3h 00m' },
  { title: 'Deployment & Conclusion', duration: '50 min' },
];

const CourseDetail = ({ contract, account, showToast }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [course, setCourse]               = useState(null);
  const [lessons, setLessons]             = useState([]);
  const [isPurchased, setIsPurchased]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading]   = useState(false);
  const [activeLesson, setActiveLesson]   = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch course from API (with fallback)
      const found = await fetchCourseById(id);
      if (!found) { navigate('/'); return; }
      setCourse(found);

      // Fetch lessons from API
      const courseDocId = found.courseId || `course_${found.id}`;
      const apiLessons = await fetchLessonsByCourse(courseDocId);
      if (apiLessons && apiLessons.length > 0) {
        setLessons(apiLessons.map(l => ({
          title: l.title,
          duration: l.duration ? `${l.duration} min` : '30 min',
        })));
      } else {
        setLessons(defaultSyllabus);
      }

      // Check enrollment (fiat cache, web3 cache, on-chain)
      if (account) {
        let purchased = false;
        const fiat = JSON.parse(localStorage.getItem(`fiat_${account}`) || '[]');
        if (fiat.includes(found.id) || isWeb3PurchasedLocally(account, found.id)) {
          purchased = true;
        } else if (contract && found.web3Purchasable) {
          try {
            purchased = await contract.isEnrolled(account, found.id);
            if (purchased) markWeb3Purchased(account, found.id);
          } catch (e) { console.error(e); }
        }
        setIsPurchased(purchased);
        if (purchased) {
          const pData = JSON.parse(localStorage.getItem(`progress_${account}`) || '{}');
          if (!pData[found.id]) {
            pData[found.id] = 10;
            localStorage.setItem(`progress_${account}`, JSON.stringify(pData));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, contract, account, navigate]);

  const handleLessonChange = (idx) => {
    if (!isPurchased) return;
    setActiveLesson(idx);
    if (account && course) {
      const pData = JSON.parse(localStorage.getItem(`progress_${account}`) || '{}');
      pData[course.id] = Math.min(100, (pData[course.id] || 10) + 20);
      localStorage.setItem(`progress_${account}`, JSON.stringify(pData));
    }
  };

  const openPaymentModal = async () => {
    if (!course?.web3Purchasable) {
      showToast('This course is not on blockchain yet. Use Fiat payment.', 'error');
      return;
    }
    if (contract) {
      try {
        const onChain = await fetchOnChainCourse(contract, course.id);
        setCourse(prev => ({ ...prev, priceEth: onChain.priceEth }));
      } catch (e) {
        showToast(getWeb3PaymentErrorMessage(e), 'error');
        return;
      }
    }
    setPaymentModalOpen(true);
  };

  const executeWeb3Payment = async () => {
    if (!contract || !course) return;

    try {
      setPurchaseLoading(true);
      showToast('Confirm transaction in MetaMask...', 'info');
      const { priceEth, courseId } = await purchaseCourseOnChain(contract, course);
      markWeb3Purchased(account, courseId);
      showToast(`Purchased for ${priceEth} ETH!`, 'success');
      setIsPurchased(true);
      setPaymentModalOpen(false);
    } catch (e) {
      console.error('Web3 payment error:', e);
      showToast(getWeb3PaymentErrorMessage(e), 'error');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const executeFiatPayment = () => {
    if (!course) return;
    setPurchaseLoading(true);
    setTimeout(() => {
      const fp = JSON.parse(localStorage.getItem(`fiat_${account}`) || '[]');
      if (!fp.includes(course.id)) { fp.push(course.id); localStorage.setItem(`fiat_${account}`, JSON.stringify(fp)); }
      showToast('Payment successful!', 'success');
      setIsPurchased(true);
      setPaymentModalOpen(false);
      setPurchaseLoading(false);
    }, 2000);
  };

  if (loading || !course) return <div className="page-loader"><div className="loader-ring" /><p>Loading course...</p></div>;

  return (
    <div className="detail-page">
      {/* Hero Banner */}
      <div className="detail-hero">
        <div className="detail-hero-content">
          <div className="detail-tags">
            <span className="detail-cat-badge">{course.category}</span>
            <span className="detail-rating">⭐ {course.rating}</span>
          </div>
          <h1 className="detail-title">{course.title}</h1>
          <p className="detail-desc">{course.description}</p>
          <div className="detail-meta-row">
            <span>👨‍🏫 <strong>{course.instructor}</strong></span>
            <span>👥 {course.studentsEnrolled.toLocaleString()} students</span>
            <span>⏱ {course.duration}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="detail-body">
        {/* Main */}
        <div className="detail-main">
          {isPurchased ? (
            <>
              <div className="learning-header">
                <span className="learning-badge">✅ Enrolled</span>
                <h2 className="learning-title">{course.title}</h2>
                {course.description && <p className="learning-desc">{course.description}</p>}
              </div>

              <div className="video-container">
                <CourseVideoPlayer
                  videoUrl={course.videoUrl}
                  videoProvider={course.videoProvider}
                  videoCid={course.videoCid}
                  title={course.title}
                  autoplay={!!(course.videoUrl || course.videoCid)}
                />
              </div>

              <div className="syllabus-section">
                <h2 className="section-heading">{t("detail_course_content")}</h2>
                <div className="syllabus-list">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className={`syllabus-item ${activeLesson === idx ? 'syllabus-active' : ''}`}
                      onClick={() => handleLessonChange(idx)}
                    >
                      <div className="syllabus-num">
                        {activeLesson === idx ? '▶' : idx + 1}
                      </div>
                      <span className="syllabus-title">{lesson.title}</span>
                      <span className="syllabus-duration">{lesson.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="video-container">
              <div className="locked-overlay">
                <div className="lock-icon-wrap">🔒</div>
                <h2>{t("detail_locked_title")}</h2>
                <p>{t("detail_locked_desc")}</p>
                <button
                  className="unlock-cta-btn"
                  onClick={() => { if (!account) { showToast('Connect wallet first', 'error'); return; } openPaymentModal(); }}
                >
                  {t("detail_unlock_now")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {!isPurchased && (
          <div className="detail-sidebar">
            <img src={course.image} alt={course.title} className="sidebar-thumb" />
            <div className="sidebar-price">⟠ {course.priceEth} ETH</div>
            <ul className="sidebar-perks">
              <li>⏱ {course.duration} {t("detail_ondemand")}</li>
              <li>📱 {t("detail_access")}</li>
              <li>🏆 {t("detail_cert")}</li>
              <li>♾️ {t("detail_lifetime")}</li>
            </ul>
            <button
              className="sidebar-unlock-btn"
              onClick={() => { if (!account) { showToast('Connect wallet first', 'error'); return; } openPaymentModal(); }}
            >
              {t("detail_unlock_now")}
            </button>
            <p className="sidebar-guarantee">{t("detail_money_back")}</p>
          </div>
        )}
      </div>

      {paymentModalOpen && (
        <PaymentModal
          course={course}
          onClose={() => { if (!purchaseLoading) setPaymentModalOpen(false); }}
          onPayWeb3={executeWeb3Payment}
          onPayFiat={executeFiatPayment}
          loading={purchaseLoading}
        />
      )}
    </div>
  );
};

export default CourseDetail;
