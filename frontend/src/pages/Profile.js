import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const Profile = ({ account, showToast }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ displayName: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (account) {
      const saved = localStorage.getItem(`profile_${account}`);
      setFormData(saved ? JSON.parse(saved) : {
        displayName: `User_${account.substring(2, 6)}`,
        bio: '',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${account}`
      });
    }
  }, [account]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem(`profile_${account}`, JSON.stringify(formData));
      showToast('Profile saved!', 'success');
      window.dispatchEvent(new Event('profileUpdated'));
      setSaving(false);
    }, 800);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!account) return (
    <div className="empty-page">
      <div className="empty-icon">🔗</div>
      <h2>{t("profile_connect_prompt")}</h2>
    </div>
  );

  const shortAddr = `${account.substring(0, 8)}...${account.substring(account.length - 6)}`;

  return (
    <div className="profile-page">
      <div className="profile-left">
        <div className="profile-avatar-section">
          <img
            src={formData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${account}`}
            alt="Avatar"
            className="profile-avatar"
          />
          <h3 className="profile-name">{formData.displayName || 'Anonymous'}</h3>
          <p className="profile-bio-preview">{formData.bio || 'No bio yet'}</p>
        </div>

        <div className="wallet-card">
          <div className="wallet-card-label">🔗 Wallet Address</div>
          <div className="wallet-card-address">{shortAddr}</div>
          <button className="wallet-copy-btn" onClick={copyAddress}>
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>

        <div className="profile-stats-mini">
          <div className="profile-stat-mini">
            <span className="psm-val">2026</span>
            <span className="psm-label">Member Since</span>
          </div>
          <div className="profile-stat-mini">
            <span className="psm-val">ETH</span>
            <span className="psm-label">Network</span>
          </div>
        </div>
      </div>

      <div className="profile-right">
        <h2 className="section-heading" style={{ marginBottom: 28 }}>{t("profile_title")}</h2>
        <form onSubmit={handleSave} className="profile-form">
          <div className="form-group">
            <label>{t("profile_display_name")}</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label>{t("profile_avatar_url")}</label>
            <input
              type="url"
              name="avatarUrl"
              value={formData.avatarUrl}
              onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
              className="form-control"
              placeholder="https://example.com/avatar.png"
            />
          </div>
          <div className="form-group">
            <label>{t("profile_bio")}</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="form-control"
              rows="4"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="form-group">
            <label>{t("profile_wallet")}</label>
            <input type="text" value={account} className="form-control" disabled style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
          </div>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? <><span className="loader-sm" /> Saving...</> : `💾 ${t("profile_save")}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
