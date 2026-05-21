import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const PaymentModal = ({ course, onClose, onPayWeb3, onPayFiat, loading }) => {
  const { t } = useLanguage();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2 className="modal-title">{t("modal_select_payment")}</h2>
          <p className="modal-subtitle">
            {t("modal_unlocking")} <strong className="modal-course-name">{course.title}</strong>
          </p>
        </div>

        <div className="modal-price-display">
          <span className="modal-price-eth">⟠ {course.priceEth} ETH</span>
          <span className="modal-price-label">Course Price</span>
        </div>

        <div className="payment-options">
          <button
            className={`payment-option-btn payment-web3 ${loading ? 'loading' : ''}`}
            onClick={() => !loading && onPayWeb3()}
          >
            <div className="payment-option-icon">🦊</div>
            <div className="payment-option-body">
              <h4>{t("modal_crypto_title")}</h4>
              <p>{course.priceEth} ETH · {t("modal_crypto_desc")}</p>
            </div>
            <div className="payment-option-arrow">→</div>
          </button>

          <button
            className={`payment-option-btn payment-fiat ${loading ? 'loading' : ''}`}
            onClick={() => !loading && onPayFiat()}
          >
            <div className="payment-option-icon">💳</div>
            <div className="payment-option-body">
              <h4>{t("modal_fiat_title")}</h4>
              <p>{t("modal_fiat_desc")}</p>
            </div>
            <div className="payment-option-arrow">→</div>
          </button>
        </div>

        {loading && (
          <div className="modal-loading">
            <div className="modal-spinner" />
            <p>{t("modal_processing")}</p>
          </div>
        )}

        <p className="modal-guarantee">🔒 30-Day Money-Back Guarantee · Secure Transaction</p>
      </div>
    </div>
  );
};

export default PaymentModal;
