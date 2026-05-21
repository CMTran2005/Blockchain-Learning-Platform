/** Local cache of Web3-purchased course ids (blockchain course id). */

const web3Key = (account) => `web3_${account?.toLowerCase()}`;

export const getWeb3PurchasedIds = (account) => {
  if (!account) return [];
  try {
    return JSON.parse(localStorage.getItem(web3Key(account)) || '[]');
  } catch {
    return [];
  }
};

export const markWeb3Purchased = (account, courseId) => {
  if (!account || courseId == null) return;
  const list = getWeb3PurchasedIds(account);
  const id = Number(courseId);
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(web3Key(account), JSON.stringify(list));
  }
};

export const isWeb3PurchasedLocally = (account, courseId) =>
  getWeb3PurchasedIds(account).includes(Number(courseId));
